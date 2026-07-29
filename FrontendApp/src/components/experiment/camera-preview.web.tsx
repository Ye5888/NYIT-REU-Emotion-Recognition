/**
 * The live camera feed.
 *
 * A raw <video> element rather than anything from react-native: on web,
 * react-native-web compiles to the DOM anyway, and a MediaStream has to be
 * handed to a real video node through `srcObject` — there is no RN component
 * that accepts one.
 *
 * Mirrored, because an un-mirrored preview reads as wrong to anyone who has
 * ever used a mirror, and this view exists to help people position themselves.
 * Only the preview is flipped; the recorded stream is untouched.
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCamera } from '@/experiment/camera';
import { Spacing } from '@/constants/theme';

interface Props {
  height?: number;
  /** Rounded corners; off for the small in-task inset. */
  rounded?: boolean;
}

export function CameraPreview({ height = 260, rounded = true }: Props) {
  const { getStream, status } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    const stream = getStream() as MediaStream | null;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
    // Re-runs on status change, which is when a stream appears or is replaced.
  }, [getStream, status]);

  return (
    <View style={[styles.frame, { height }, rounded && styles.rounded]}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          display: 'block',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden', backgroundColor: '#000' },
  rounded: { borderRadius: Spacing.three },
});
