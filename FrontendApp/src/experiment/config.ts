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

// --- Granular data-sharing categories (Cao's privacy-by-design — TBD; may become
//     nested tiers: raw / facial-param / model-param) ---------------------------
export const DATA_CATEGORIES = ['webcam', 'audio', 'behavioralTraces', 'modelParams'] as const;
export type DataCategory = (typeof DATA_CATEGORIES)[number];

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
  webcam: 'Webcam video',
  audio: 'Audio',
  behavioralTraces: 'Interaction traces',
  modelParams: 'On-device model parameters (federated)',
};
