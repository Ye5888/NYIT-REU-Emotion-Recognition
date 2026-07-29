/**
 * Web capture: getUserMedia + MediaRecorder.
 *
 * Not expo-camera — its `recordAsync` is Android/iOS only (SDK 57 docs), so on
 * web it could give us a preview and nothing else. These are standard browser
 * APIs and cost no dependency.
 *
 * Video only. Audio would mean a second permission prompt for a modality
 * nothing downstream consumes yet.
 */
import { CameraError, type CameraController, type CaptureStream } from './camera-contract';

const CONSTRAINTS: MediaStreamConstraints = {
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
  audio: false,
};

/** Best available container, newest first; '' lets the browser choose. */
const MIME_CANDIDATES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', ''];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_CANDIDATES.find((t) => t === '' || MediaRecorder.isTypeSupported(t)) ?? '';
}

let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

export const cameraController: CameraController = {
  isSupported() {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  },

  async acquire() {
    if (stream) return;

    if (!this.isSupported()) {
      throw new CameraError('unsupported', 'This browser cannot capture video.');
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
    } catch (err) {
      // Browsers disagree on wording but agree on these names.
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new CameraError('denied', 'Camera permission was declined.');
      }
      throw new CameraError('unavailable', 'No camera is available on this device.');
    }
  },

  getStream(): CaptureStream | null {
    return stream;
  },

  startRecording() {
    if (!stream) throw new CameraError('unavailable', 'Camera was not acquired.');
    if (recorder) return Date.now();

    chunks = [];
    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // One-second slices rather than a single blob at stop: if the tab dies
    // mid-session, whatever already fired is still in hand.
    recorder.start(1000);
    return Date.now();
  },

  isRecording() {
    return recorder?.state === 'recording';
  },

  stopRecording() {
    return new Promise<Blob | null>((resolve) => {
      if (!recorder) {
        resolve(null);
        return;
      }

      const active = recorder;
      const type = active.mimeType || 'video/webm';

      active.onstop = () => {
        recorder = null;
        resolve(chunks.length ? new Blob(chunks, { type }) : null);
      };

      if (active.state === 'inactive') active.onstop?.(new Event('stop'));
      else active.stop();
    });
  },

  release() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorder = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    chunks = [];
  },
};
