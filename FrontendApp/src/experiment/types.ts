/**
 * Core experiment data model.
 *
 * The definition types mirror Backend/schema/definitions.schema.json, which is
 * what actually validates them. Keep the two in sync.
 */
import type { DataCategory, Modality } from './config';

export type Speaker = 'tutor' | 'peer';

/** Truth values of the tutor's and the peer's claims, in that order. */
export type Condition = 'TT' | 'TF' | 'FT' | 'FF';

/** Per participant: probes after each trial, or all of them at the end. */
export type ProbeTiming = 'immediate' | 'retrospective';

// --- Definition side ---------------------------------------------------------

export interface CaseStudy {
  id: string;
  topic: string;
  index: number;
  source?: string;
  studyText: string;
  flaw: string;
  trialCount: number;
}

export interface Turn {
  speaker: Speaker;
  text: string;
}

export interface Assertion {
  speaker: Speaker;
  variants: Record<'T' | 'F', string>;
}

export interface TaskTrial {
  id: string;
  caseStudyId: string;
  index: number;
  facet: string;
  advanceTurn: Turn;
  assertions: Assertion[];
  forcedChoicePrompt: string;
  choices: string[];
  /** Ground truth about the facet. Deliberately independent of `condition`. */
  correctKey: string;
}

export interface ProbeQuestion {
  id: string;
  modality: Modality;
  responseType: 'scale' | 'choice' | 'text';
  prompt: string;
  scale?: { min: number; max: number };
  choices?: string[];
  definitionVariant?: string | null;
}

export interface AssessmentItem {
  id: string;
  stage: 'pretest' | 'posttest' | 'transfer';
  construct: string;
  transferType?: 'near' | 'far';
  responseType: 'choice';
  prompt: string;
  choices: string[];
  correctKey: string;
}

export interface Protocol {
  version: string;
  policy: {
    probeTiming: string;
    probeOrder: string;
    defineLabels: boolean;
  };
  probeIds: string[];
  assessmentItemIds: Record<'pretest' | 'posttest' | 'transfer', string[]>;
  caseStudyIds: string[];
}

// --- Run side ----------------------------------------------------------------

/** This participant's realized draw. Persisted rather than recomputed. */
export interface Assignment {
  probeTiming: ProbeTiming;
  probeOrder: string[];
  caseStudies: { caseStudyId: string; condition: Condition }[];
}

export interface ForcedChoiceResponse {
  trialId: string;
  caseStudyId: string;
  value: string;
  correct: boolean;
  respondedAt: number;
}

export interface ProbeResponse {
  trialId: string;
  questionId: string;
  value: number | string;
  respondedAt: number;
}

export interface AssessmentResponse {
  itemId: string;
  stage: 'pretest' | 'posttest' | 'transfer';
  value: string;
  correct: boolean;
  respondedAt: number;
}

/**
 * Two-set consent. Invariant: `submitted` ⊆ `current`, and `submitted` never
 * shrinks (data that has left the device cannot be un-sent).
 */
export interface ConsentState {
  current: DataCategory[]; // live choices; editable in the range [submitted, all]
  submitted: DataCategory[]; // irrevocable; only grows
}

/** Derived from ConsentState — never stored. See ./consent.ts. */
export type SubmissionStatus = 'none' | 'partial' | 'complete';

export interface SessionState {
  sessionId: string;
  accountId?: string; // set on sign-in (return-to-submit flow)
  protocolVersion: string;
  seed: number;
  consent: ConsentState;
  assignment: Assignment;
  forcedChoices: ForcedChoiceResponse[];
  probes: ProbeResponse[];
  assessments: AssessmentResponse[];
}

/** Which of an assertion's two variants is spoken under a given condition. */
export function utteranceFor(assertion: Assertion, condition: Condition): string {
  const truth = assertion.speaker === 'tutor' ? condition[0] : condition[1];
  return assertion.variants[truth as 'T' | 'F'];
}
