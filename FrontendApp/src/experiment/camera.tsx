/**
 * Camera state as React context — the device outlives individual screens.
 *
 * The framing check acquires the camera and the task starts the recording, so
 * ownership cannot sit in either screen: unmounting one would drop the stream
 * and re-prompt for permission. The provider holds it for the whole session,
 * exactly as SessionProvider holds the run data.
 *
 * This provider knows nothing about the experiment. Writing `recordingStartedAt`
 * and the capture marks into the session is the screens' job.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { cameraController } from './camera-controller';
import { CameraError, type CameraFailure } from './camera-contract';
import type { CaptureStatus } from './types';

interface CameraContextValue {
  status: CaptureStatus;
  /** Set only when status is 'unavailable'. */
  failure: CameraFailure | null;
  message: string | null;
  supported: boolean;
  /** Open the camera and go live. Safe to call again after a failure. */
  acquire: () => Promise<void>;
  /** Start recording; returns the epoch ms to measure offsets from, or null. */
  beginRecording: () => number | null;
  stopRecording: () => Promise<Blob | null>;
  /**
   * Close the camera and turn the indicator light off.
   *
   * Distinct from `stopRecording`, and both are needed: stopping the recorder
   * ends the capture, but the browser holds the device — and keeps the light on
   * — until the stream's tracks are stopped.
   */
  release: () => void;
  getStream: () => unknown | null;
}

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // The camera is a device, not state: it must be handed back when the app goes
  // away, or the browser keeps the recording indicator lit.
  useEffect(() => () => cameraController.release(), []);

  const acquire = useCallback(async () => {
    setFailure(null);
    setMessage(null);
    try {
      await cameraController.acquire();
      setStatus('ready');
    } catch (err) {
      const reason = err instanceof CameraError ? err.reason : 'unavailable';
      setFailure(reason);
      setMessage(err instanceof Error ? err.message : 'The camera could not be opened.');
      setStatus('unavailable');
    }
  }, []);

  const beginRecording = useCallback(() => {
    try {
      const startedAt = cameraController.startRecording();
      setStatus('recording');
      return startedAt;
    } catch {
      // Never strand a participant mid-study over a capture failure; the run is
      // still worth having without video.
      setStatus('unavailable');
      setFailure('unavailable');
      setMessage('Recording could not be started.');
      return null;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const blob = await cameraController.stopRecording();
    setStatus('stopped');
    return blob;
  }, []);

  const release = useCallback(() => {
    cameraController.release();
    setStatus('stopped');
  }, []);

  const value = useMemo<CameraContextValue>(
    () => ({
      status,
      failure,
      message,
      supported: cameraController.isSupported(),
      acquire,
      beginRecording,
      stopRecording,
      release,
      getStream: () => cameraController.getStream(),
    }),
    [status, failure, message, acquire, beginRecording, stopRecording, release],
  );

  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}

export function useCamera(): CameraContextValue {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error('useCamera must be used within <CameraProvider>');
  return ctx;
}
