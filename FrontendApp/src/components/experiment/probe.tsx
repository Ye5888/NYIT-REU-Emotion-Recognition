/**
 * The self-report *probe* (the team's term — deliberately NOT "survey", which is
 * taken by the IRB instrument). One component, two contexts:
 *   - timing="during" → rendered as an overlay on top of the task
 *   - timing="after"  → rendered inline on the probe route
 * Placeholder for now; the real probe renders the assigned, ordered question set.
 */
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MODALITIES, MODALITY_LABELS } from '@/experiment/config';
import { useTheme } from '@/hooks/use-theme';
import type { ProbeTiming } from '@/experiment/types';

interface Props {
  timing: ProbeTiming;
  onDone: () => void;
}

export function Probe({ timing, onDone }: Props) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        SELF-REPORT PROBE {'·'} {timing === 'during' ? 'during task' : 'after task'}
      </ThemedText>
      <ThemedText type="subtitle">How's it going?</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Placeholder. The real probe shows an ordered set of questions drawn from the assigned
        plan. Modalities (not final): {MODALITIES.map((m) => MODALITY_LABELS[m]).join(' · ')}.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Both the timing ({timing}) and the question order come from the session seed — the
        randomization policy itself is still TBD.
      </ThemedText>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.text }]}
        onPress={onDone}
        accessibilityRole="button">
        <ThemedText style={[styles.buttonText, { color: theme.background }]}>
          {timing === 'during' ? 'Resume task' : 'Continue'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.four, borderRadius: Spacing.three, width: '100%' },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
