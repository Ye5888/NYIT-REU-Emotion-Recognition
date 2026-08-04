/**
 * Native placeholder for the camera preview. See camera-controller.ts for why
 * there is no native capture yet.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface Props {
  height?: number;
  rounded?: boolean;
}

export function CameraPreview({ height = 260, rounded = true }: Props) {
  return (
    <View style={[styles.frame, { height }, rounded && styles.rounded]}>
      <ThemedText type="small" themeColor="textSecondary">
        Camera preview is web only
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,127,127,0.15)',
  },
  rounded: { borderRadius: Spacing.three },
});
