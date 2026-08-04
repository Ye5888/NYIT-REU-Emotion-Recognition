/**
 * Write path for run data — the seam between the session held in memory and the
 * backend's /sessions collection.
 *
 * Write-as-you-go rather than write-once-at-the-end: attrition in a
 * confusion-induction paradigm is not random. A participant who quits mid-task
 * is plausibly one who dropped past the frustration threshold, which is exactly
 * the transition under study. Buffering to the end would discard those runs and
 * leave no trace they happened. Sessions therefore start life as `inProgress`
 * and only become `complete` at the end; anything left `inProgress` is an
 * abandoned run with its partial data intact.
 *
 * Three rules govern everything here:
 *
 *   1. Never block the participant. `persist` returns void, is never awaited,
 *      and a failed write never surfaces in the UI or gates navigation. A
 *      dropped connection must not interrupt a trial.
 *   2. Every write is idempotent. Documents are addressed by client-chosen ids
 *      derived from what they describe, so a retry overwrites its own document
 *      rather than leaving a duplicate.
 *   3. Order is preserved. One job at a time, so the session document exists
 *      before the responses that belong to it.
 */
import { ApiError, api } from './api';
import type {
  AssessmentResponse,
  CaptureMark,
  ForcedChoiceResponse,
  ProbeResponse,
  ProbeTiming,
  ResponseDoc,
  SessionDoc,
  SessionState,
} from './types';

/** One flush's worth of run data, tagged by what produced it. */
export type RunWrite =
  | { kind: 'sessionStart' }
  | { kind: 'sessionPatch'; patch: Partial<SessionDoc> }
  | { kind: 'assessments'; responses: AssessmentResponse[] }
  | { kind: 'probes'; timing: ProbeTiming; responses: ProbeResponse[] }
  | { kind: 'forcedChoices'; responses: ForcedChoiceResponse[] };

const MAX_ATTEMPTS = 4;
const BACKOFF_MS = [500, 2000, 8000];

interface Job {
  run: () => Promise<unknown>;
  label: string;
  attempts: number;
}

const queue: Job[] = [];
let draining = false;

function enqueue(label: string, run: () => Promise<unknown>) {
  queue.push({ run, label, attempts: 0 });
  void drain();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A 4xx means this document will never be accepted — retrying is just a slower
 * way to fail. Network errors and 5xx are transient and worth another go.
 */
function isPermanent(err: unknown): boolean {
  return err instanceof ApiError && err.status >= 400 && err.status < 500;
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;

  while (queue.length > 0) {
    const job = queue[0];
    try {
      await job.run();
      queue.shift();
    } catch (err) {
      job.attempts += 1;

      if (isPermanent(err) || job.attempts >= MAX_ATTEMPTS) {
        // Dropping one write is survivable; blocking the queue behind it is not,
        // because everything after it would be lost too.
        console.warn(`[persist] giving up on ${job.label}`, err);
        queue.shift();
        continue;
      }

      await sleep(BACKOFF_MS[Math.min(job.attempts - 1, BACKOFF_MS.length - 1)]);
    }
  }

  draining = false;
}

/** The stored document, assembled from the in-memory session. */
function sessionDoc(s: SessionState): SessionDoc {
  return {
    protocolVersion: s.protocolVersion,
    seed: s.seed,
    consent: s.consent,
    assignment: s.assignment,
    status: 'inProgress',
    startedAt: Date.now(),
    ...(s.recordingStartedAt ? { captures: { recordingStartedAt: s.recordingStartedAt } } : {}),
  };
}

/**
 * Document ids describe what they hold, so the same answer always lands in the
 * same place. A participant cannot answer the same item twice, so collisions
 * only ever mean "this is a retry of that write".
 */
function responseId(doc: ResponseDoc): string {
  if (doc.stage === 'task') return `task_${doc.trialId}`;
  if (doc.stage === 'probe') return `probe_${doc.caseStudyId}_${doc.itemId}`;
  return `${doc.stage}_${doc.itemId}`;
}

function writeResponses(sessionId: string, docs: ResponseDoc[]) {
  docs.forEach((doc) => {
    const id = responseId(doc);
    enqueue(`response ${id}`, () => api.putResponse(sessionId, { ...doc, id }));
  });
}

export function persist(session: SessionState, write: RunWrite): void {
  const sessionId = session.sessionId;

  switch (write.kind) {
    case 'sessionStart':
      enqueue('session create', () =>
        api.createSession({ ...sessionDoc(session), id: sessionId }),
      );
      return;

    case 'sessionPatch':
      enqueue('session patch', () => api.patchSession(sessionId, write.patch));
      return;

    case 'assessments':
      writeResponses(
        sessionId,
        write.responses.map((r) => ({
          stage: r.stage,
          itemId: r.itemId,
          value: r.value,
          correct: r.correct,
          respondedAt: r.respondedAt,
        })),
      );
      return;

    case 'forcedChoices':
      writeResponses(
        sessionId,
        write.responses.map((r) => ({
          stage: 'task' as const,
          itemId: r.trialId,
          trialId: r.trialId,
          caseStudyId: r.caseStudyId,
          value: r.value,
          correct: r.correct,
          respondedAt: r.respondedAt,
        })),
      );
      return;

    case 'probes':
      writeResponses(
        sessionId,
        write.responses.map((r) => ({
          stage: 'probe' as const,
          itemId: r.questionId,
          caseStudyId: r.caseStudyId,
          timing: write.timing,
          value: r.value,
          respondedAt: r.respondedAt,
        })),
      );
      return;
  }
}

/** Marks are session-level, so they ride along with whatever patch is next. */
export function persistMarks(session: SessionState, marks: CaptureMark[]): void {
  persist(session, { kind: 'sessionPatch', patch: { marks } });
}

// --- Video -------------------------------------------------------------------
//
// Parts go up as the recorder produces them, through the same queue as
// everything else, so they inherit the same retry and ordering behaviour. The
// queue being serial matters more here than elsewhere: the parts of a
// MediaRecorder stream are only a valid file in order.

export function persistVideoChunk(sessionId: string, chunk: Blob, seq: number): void {
  enqueue(`video part ${seq}`, () => api.putVideoChunk(sessionId, chunk, seq));
}

/** Stitch the parts into one file server-side and record where it landed. */
export function persistVideoFinalize(sessionId: string): void {
  enqueue('video finalize', () => api.finalizeVideo(sessionId));
}

/**
 * Send a whole recording at once.
 *
 * The path for a participant who declined raw video at the start and changed
 * their mind at the end: nothing was streamed, so the retained blob goes up as a
 * single part and is finalized immediately.
 */
export function persistWholeVideo(sessionId: string, blob: Blob): void {
  enqueue('video whole', () => api.putVideoChunk(sessionId, blob, 0));
  persistVideoFinalize(sessionId);
}
