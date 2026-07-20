/**
 * Consent as an append-only ratchet.
 *
 * `submitted` is immutable history (facts that happened — data left the device).
 * `current` is mutable intent. Every operation here preserves the invariant
 * `submitted ⊆ current`, which makes the illegal state (un-submitting) simply
 * unreachable rather than merely discouraged.
 */
import type { DataCategory } from './config';
import type { ConsentState, SubmissionStatus } from './types';

export function emptyConsent(): ConsentState {
  return { current: [], submitted: [] };
}

/** Categories the subject has consented to but not yet submitted. */
export function pendingCategories(c: ConsentState): DataCategory[] {
  return c.current.filter((cat) => !c.submitted.includes(cat));
}

/**
 * Toggle a category in `current`. Turning one OFF is refused if it has already
 * been submitted — revocation is meaningless once the data is sent.
 */
export function setConsent(c: ConsentState, cat: DataCategory, on: boolean): ConsentState {
  if (!on && c.submitted.includes(cat)) return c; // cannot revoke what's submitted
  const has = c.current.includes(cat);
  if (on === has) return c; // no change
  return {
    ...c,
    current: on ? [...c.current, cat] : c.current.filter((x) => x !== cat),
  };
}

/**
 * Submit some-or-all pending categories. `submitted` grows and stays a subset of
 * `current` by construction. Omit `cats` to submit everything pending.
 */
export function submit(c: ConsentState, cats?: DataCategory[]): ConsentState {
  const toSend = (cats ?? pendingCategories(c)).filter((cat) => c.current.includes(cat));
  return { ...c, submitted: Array.from(new Set([...c.submitted, ...toSend])) };
}

/** Derived status — computed from the two sets, never stored. */
export function submissionStatus(c: ConsentState): SubmissionStatus {
  if (c.submitted.length === 0) return 'none';
  // invariant guarantees submitted ⊆ current, so equal lengths ⇒ equal sets
  return c.submitted.length < c.current.length ? 'partial' : 'complete';
}
