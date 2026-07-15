/**
 * The probe randomization policy lives HERE and nowhere else.
 *
 * Whether we ask all modalities in one shuffled order (design A) or one modality
 * in a fixed order (design B) — or something else — is a decision that changes
 * only this function. It never touches `SessionState`, which stores only the
 * resolved `ProbePlan` this returns.
 *
 * Stub for now: returns an empty ordered plan. When the policy is decided, this
 * is the single place to implement it (deck slides 7 & 12 — still TBD).
 */
import type { ProbePlan } from './types';

export function assignProbes(seed: number): ProbePlan {
  // TODO(policy TBD):
  //   A) all modalities, whole question set shuffled into one random order
  //   B) one modality per subject, fixed order
  //   Draw deterministically from `seed` so a session is reproducible.
  return { seed, questionIds: [] };
}
