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
// These were four independent toggles. They are not independent: model updates,
// facial measurements and the raw recording are all derived from the same
// capture, in that order of revealingness. Consenting to the video necessarily
// consents to what can be computed from it, so the video side is a ladder —
// each rung includes the ones below it — not a set of checkboxes.
//
// Representing it as a nested set keeps the existing ConsentState machinery
// intact: sharing more means adding a higher rung, and the ratchet in consent.ts
// already refuses to remove anything submitted.
//
// `audio` is gone. We capture video only, and asking consent for something that
// is never collected is worse than not asking. Put it back when audio exists.

/** Video-derived disclosure, least to most revealing. Each rung implies those below it. */
export const VIDEO_TIERS = ['modelUpdates', 'facialMetrics', 'rawVideo'] as const;

/** Not derived from the recording, so it moves independently of the ladder. */
export const INDEPENDENT_CATEGORIES = ['behavioralTraces'] as const;

export const DATA_CATEGORIES = [...VIDEO_TIERS, ...INDEPENDENT_CATEGORIES] as const;
export type DataCategory = (typeof DATA_CATEGORIES)[number];
export type VideoTier = (typeof VIDEO_TIERS)[number];

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
  modelUpdates: 'Model updates only',
  facialMetrics: 'Facial measurements',
  rawVideo: 'The video recording',
  behavioralTraces: 'Your answers and timings',
};

/** What each option means in the participant's terms, not ours. */
export const DATA_CATEGORY_BLURBS: Record<DataCategory, string> = {
  modelUpdates:
    'Your video is processed on this device and only the resulting numbers are sent. No footage and no measurements of your face leave.',
  facialMetrics:
    'Measurements describing how your face moved — no video, and not enough to rebuild it.',
  rawVideo: 'The recording itself, showing your face.',
  behavioralTraces: 'What you answered and how long you took. Nothing from the camera.',
};
