import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SPEAKER_LABELS, SPEAKER_ROLES } from '@/experiment/config';
import type { Speaker } from '@/experiment/types';

export type TurnSpeaker = Speaker | 'participant';

interface Props {
  speaker: TurnSpeaker;
  text: string;
}

export function DialogueTurn({ speaker, text }: Props) {
  const isParticipant = speaker === 'participant';
  const name = isParticipant ? 'You' : SPEAKER_LABELS[speaker];
  const role = isParticipant ? 'Participant' : SPEAKER_ROLES[speaker];

  return (
    <View style={[styles.row, isParticipant && styles.rowOwn]}>
      <View style={[styles.meta, isParticipant && styles.metaOwn]}>
        <ThemedText type="smallBold">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {role}
        </ThemedText>
      </View>
      <ThemedView
        type={isParticipant ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.bubble, isParticipant && styles.bubbleOwn]}>
        <ThemedText>{text}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one, marginBottom: Spacing.three },
  rowOwn: { alignItems: 'flex-end' },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  metaOwn: { flexDirection: 'row-reverse' },
  bubble: { padding: Spacing.three, borderRadius: Spacing.three, alignSelf: 'stretch' },
  bubbleOwn: { alignSelf: 'flex-end', maxWidth: '80%' },
});
