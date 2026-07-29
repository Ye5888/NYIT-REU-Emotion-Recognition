/**
 * Consent as an append-only ratchet.
 *
 * `submitted` is immutable history (facts that happened — data left the device).
 * `current` is mutable intent. Every operation here preserves the invariant
 * `submitted ⊆ current`, which makes the illegal state (un-submitting) simply
 * unreachable rather than merely discouraged.
 */
import { VIDEO_TIERS, type DataCategory } from './config';
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

// --- The video ladder --------------------------------------------------------
//
// VIDEO_TIERS is ordered least to most revealing and each rung implies those
// below it, so the chosen rung is just the highest one present. Both helpers go
// through setConsent, which means the ratchet is enforced for free: a rung that
// has already been submitted cannot be stepped back down.

/** Index into VIDEO_TIERS, or -1 for "nothing from the recording". */
export function videoTier(c: ConsentState): number {
  return VIDEO_TIERS.reduce((highest, tier, i) => (c.current.includes(tier) ? i : highest), -1);
}

/** The lowest rung still selectable — anything submitted is a floor. */
export function videoTierFloor(c: ConsentState): number {
  return VIDEO_TIERS.reduce((highest, tier, i) => (c.submitted.includes(tier) ? i : highest), -1);
}

/** Move to a rung, turning on everything below it and off everything above. */
export function setVideoTier(c: ConsentState, tierIndex: number): ConsentState {
  return VIDEO_TIERS.reduce((acc, tier, i) => setConsent(acc, tier, i <= tierIndex), c);
}

/** Derived status — computed from the two sets, never stored. */
export function submissionStatus(c: ConsentState): SubmissionStatus {
  if (c.submitted.length === 0) return 'none';
  // invariant guarantees submitted ⊆ current, so equal lengths ⇒ equal sets
  return c.submitted.length < c.current.length ? 'partial' : 'complete';
}
