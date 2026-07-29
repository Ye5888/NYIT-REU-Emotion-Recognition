/**
 * Write path for run data — the seam between the session held in memory and
 * the backend's /sessions and /sessions/:id/responses collections.
 *
 * Deliberately write-as-you-go rather than write-once-at-the-end: attrition in
 * a confusion-induction paradigm is not random. A participant who quits mid-task
 * is plausibly one who dropped past the frustration threshold, which is exactly
 * the transition the study is about. Buffering everything until `done` would
 * silently discard those runs and leave no trace that they happened.
 *
 * The transport is not wired yet. These are the flush points; each one is the
 * single place its stage's data leaves the device, so turning persistence on is
 * a change inside this file and nowhere else.
 */
import type { AssessmentResponse, ForcedChoiceResponse, ProbeResponse, SessionState } from './types';

/** One flush's worth of run data, tagged by which screen produced it. */
export type RunWrite =
  | { kind: 'session'; consentGivenAt: number }
  | { kind: 'assessments'; stage: AssessmentResponse['stage']; responses: AssessmentResponse[] }
  | { kind: 'probes'; caseStudyId: string; responses: ProbeResponse[] }
  | { kind: 'forcedChoices'; caseStudyId: string; responses: ForcedChoiceResponse[] };

/**
 * Hand a completed unit of run data to the backend.
 *
 * TODO(persistence): POST /sessions on the first call of a run, then
 * POST /sessions/:sessionId/responses for each subsequent write. Failures must
 * not block the participant — queue and retry, never surface an error mid-task
 * and never gate `router.push` on the response.
 */
export function persist(session: SessionState, write: RunWrite): void {
  if (__DEV__) {
    console.log(`[persist] ${session.sessionId} ${write.kind}`, write);
  }
}
