import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SPEAKER_LABELS, SPEAKER_ROLES } from '@/experiment/config';
import type { Speaker } from '@/experiment/types';

interface Props {
  speaker: Speaker;
  text: string;
}

export function DialogueTurn({ speaker, text }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.meta}>
        <ThemedText type="smallBold">{SPEAKER_LABELS[speaker]}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {SPEAKER_ROLES[speaker]}
        </ThemedText>
      </View>
      <ThemedView type="backgroundElement" style={styles.bubble}>
        <ThemedText>{text}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one, marginBottom: Spacing.three },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  bubble: { padding: Spacing.three, borderRadius: Spacing.three },
});
