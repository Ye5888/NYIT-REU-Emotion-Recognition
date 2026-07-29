/**
 * The capture contract, shared by both platform implementations.
 *
 * Lives in its own module because `camera-controller.ts` and
 * `camera-controller.web.ts` cannot import types from each other — Metro would
 * resolve the import back to whichever file is asking.
 *
 * Web is the only implementation today. The study is run on desktop by design
 * (steadier framing and better webcams than a handheld phone), but the seam is
 * here so a native implementation can be dropped in without changing anything
 * above the controller.
 */

/** Opaque to callers; a `MediaStream` on web. Only the preview component casts it. */
export type CaptureStream = unknown;

export type CameraFailure =
  | 'denied' // participant refused the browser permission prompt
  | 'unavailable' // no camera present, or the device is already in use
  | 'unsupported'; // platform has no capture implementation

export class CameraError extends Error {
  constructor(
    readonly reason: CameraFailure,
    message: string,
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

export interface CameraController {
  /** False when this platform has no implementation at all. */
  isSupported(): boolean;

  /** Prompt for permission and open the camera. Throws `CameraError`. */
  acquire(): Promise<void>;

  /** The live stream, for the preview to render. Null before `acquire`. */
  getStream(): CaptureStream | null;

  /** Begin recording. Returns the epoch ms that every offset is measured from. */
  startRecording(): number;

  isRecording(): boolean;

  /** Stop and hand back what was captured. Null if nothing was recorded. */
  stopRecording(): Promise<Blob | null>;

  /** Stop recording if needed, then close the camera and free the device. */
  release(): void;
}
