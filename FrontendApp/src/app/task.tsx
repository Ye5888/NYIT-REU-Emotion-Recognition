import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';
import { Probe } from '@/components/experiment/probe';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TaskScreen() {
  const router = useRouter();
  const theme = useTheme();
  // Demonstrates the "probe during task" path: the same <Probe> component
  // rendered as an overlay instead of on its own route.
  const [showProbe, setShowProbe] = useState(false);

  return (
    <>
      <PlaceholderScreen
        step="Step 2 · Task"
        title="Learning task"
        blurb="The learning activity that presents contradictory or incorrect views to induce productive confusion (D'Mello). The webcam captures facial expressions during each trial."
        todos={[
          'Trial content — confusion-induction stimuli (per D’Mello)',
          'Webcam / behavioral capture during the trial',
          'Per-trial probeTiming decides during- vs after-task prompting',
        ]}
        continueLabel="Finish task"
        onContinue={() => router.push('/probe')}>
        <TouchableOpacity
          style={[styles.secondary, { borderColor: theme.textSecondary }]}
          onPress={() => setShowProbe(true)}
          accessibilityRole="button">
          <ThemedText type="small" themeColor="textSecondary">
            ▸ Simulate a during-task probe (timing = &quot;during&quot;)
          </ThemedText>
        </TouchableOpacity>
      </PlaceholderScreen>

      {showProbe ? (
        <View style={styles.overlay}>
          <View style={styles.overlayInner}>
            <Probe timing="during" onDone={() => setShowProbe(false)} />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  secondary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  overlayInner: { width: '100%', maxWidth: 480 },
});
