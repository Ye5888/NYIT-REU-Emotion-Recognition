/**
 * Core experiment data model.
 *
 * Design commitments baked in here (see the design discussion):
 *  - Probe *timing* (during/after) is a first-class variable, not a screen.
 *  - The randomization *policy* is NOT encoded in the schema. State only ever
 *    holds the resolved, ordered `ProbePlan` (the output) plus the `seed` that
 *    produced it. See ./plan.ts for where the (undecided) policy lives.
 *  - Consent is a two-set ratchet: `submitted` only grows and is always a subset
 *    of `current`. See ./consent.ts for the invariant-preserving operations.
 */
import type { DataCategory, Modality } from './config';

export type ProbeTiming = 'during' | 'after';

/** A single question the subject could be shown. */
export interface ProbeQuestion {
  id: string;
  modality: Modality;
  prompt: string;
}

/**
 * A resolved, ordered assignment — the OUTPUT of the randomization policy.
 * Policy-agnostic on purpose: design A (all modalities shuffled) and design B
 * (one modality, fixed order) both just produce a different `questionIds` order.
 */
export interface ProbePlan {
  seed: number;
  questionIds: string[]; // ordered
}

export interface ProbeResponse {
  questionId: string;
  timing: ProbeTiming;
  value: unknown; // per-modality shape TBD
  respondedAt: number;
}

export interface Trial {
  index: number;
  probeTiming: ProbeTiming; // randomized during/after, set from the seed
  probes: ProbeResponse[];
}

/** Pretest / posttest. Exact items pulled from D'Mello when built for real. */
export interface AssessmentResult {
  score?: number;
  answers: Record<string, unknown>;
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
  seed: number; // single source of all randomization
  consent: ConsentState;
  probePlan: ProbePlan; // resolved ordered list — policy-agnostic
  pretest?: AssessmentResult;
  trials: Trial[];
  posttest?: AssessmentResult;
}
