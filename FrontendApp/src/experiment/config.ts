/**
 * Single source of truth for the lists that are NOT finalized yet.
 *
 * Both `MODALITIES` and `DATA_CATEGORIES` are plain data arrays; their TypeScript
 * types are *derived* from the arrays. Adding, renaming, or dropping an entry is a
 * one-line edit here and the type propagates everywhere. Do not hardcode these
 * string unions anywhere else.
 */

// --- Probe question modalities (deck slide 7 — still TBD, may change) ----------
export const MODALITIES = ['metaphor', 'concrete', 'positive', 'negative'] as const;
export type Modality = (typeof MODALITIES)[number];

export const MODALITY_LABELS: Record<Modality, string> = {
  metaphor: 'Metaphor',
  concrete: 'Concrete',
  positive: 'Positive emotion',
  negative: 'Negative emotion',
};

// --- Trialogue agents (D'Mello et al. 2014) -----------------------------------
export const SPEAKER_LABELS = {
  tutor: 'Dr. Williams',
  peer: 'Chris',
} as const;

export const SPEAKER_ROLES = {
  tutor: 'Tutor',
  peer: 'Student',
} as const;

// --- Granular data sharing (Cao's privacy-by-design) --------------------------
//
// This is not a question of whether to share. A session that contributes
// nothing is not worth anyone's twenty minutes, and the study cannot run on it.
// Model updates and the interaction record (answers, timings) are collected
// unconditionally and are not offered here.
//
// What the participant chooses is *how much processing happens on their own
// device before anything leaves it*. Every rung produces the same model
// updates; they differ in how raw the material is when it goes:
//
//   modelUpdates   everything computed here; only the numbers leave
//   facialMetrics  the measurements leave, the footage does not
//   rawVideo       the recording itself leaves
//
// Ordered least to most revealing, each rung implying those below it — raw video
// is sufficient to derive the measurements, which are sufficient to derive the
// updates. Representing it as a nested set keeps the ConsentState machinery
// intact: choosing a deeper rung adds to `current`, and the ratchet in consent.ts
// already refuses to remove anything submitted.
//
// `audio` is gone: we capture video only, and asking consent for something never
// collected is worse than not asking. Put it back when audio exists.

/** Processing depth, least to most revealing. Each rung implies those below it. */
export const VIDEO_TIERS = ['modelUpdates', 'facialMetrics', 'rawVideo'] as const;

/** The floor. Every session shares at least this much, so it is never offered as a choice. */
export const MINIMUM_TIER = 0;

export const DATA_CATEGORIES = VIDEO_TIERS;
export type DataCategory = (typeof DATA_CATEGORIES)[number];
export type VideoTier = DataCategory;

/**
 * Demo affordance: a button during the task that reveals the live camera feed,
 * to show a room that capture is still running.
 *
 * Expected to come OUT before real participants. Reminding someone mid-task that
 * they are on camera induces self-focused attention, which moves both affect and
 * self-report — it would perturb the thing being measured. Kept behind a flag so
 * removing it is this one line.
 */
export const SHOW_CAMERA_IN_TASK = true;

export const DATA_CATEGORY_LABELS: Record<DataCategory, string> = {
  modelUpdates: 'Keep everything on my device',
  facialMetrics: 'Send measurements, not video',
  rawVideo: 'Send the video',
};

/** What each option means in the participant's terms, not ours. */
export const DATA_CATEGORY_BLURBS: Record<DataCategory, string> = {
  modelUpdates:
    'Your video is analysed here and deleted. Only the results of the analysis are sent — no footage, and nothing describing your face.',
  facialMetrics:
    'Numbers describing how your face moved are sent; the footage stays here and is deleted.',
  rawVideo: 'The recording is sent as it is. Most useful to the research, and the least private.',
};
