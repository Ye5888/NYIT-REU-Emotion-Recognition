/**
 * Native capture — not implemented.
 *
 * The study runs on desktop web by design: a laptop webcam sits still at a
 * predictable distance, which is what the expression pipeline needs. Phones get
 * held, moved, and pointed at ceilings.
 *
 * When native is wanted, this is the file to fill in — `expo-camera`'s
 * `recordAsync` is the native path — and nothing above the controller changes.
 * Metro picks `camera-controller.web.ts` on web and this file everywhere else.
 */
import { CameraError, type CameraController, type CaptureStream } from './camera-contract';

const NOT_IMPLEMENTED = 'Video capture is only implemented for web. Run the study in a browser.';

export const cameraController: CameraController = {
  isSupported() {
    return false;
  },

  async acquire() {
    throw new CameraError('unsupported', NOT_IMPLEMENTED);
  },

  getStream(): CaptureStream | null {
    return null;
  },

  startRecording(): number {
    throw new CameraError('unsupported', NOT_IMPLEMENTED);
  },

  isRecording() {
    return false;
  },

  async stopRecording() {
    return null;
  },

  release() {},
};
