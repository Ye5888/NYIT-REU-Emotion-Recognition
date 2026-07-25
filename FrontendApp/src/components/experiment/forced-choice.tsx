import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SPEAKER_LABELS } from '@/experiment/config';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  prompt: string;
  choices: string[];
  onAnswer: (value: string) => void;
}

/**
 * The in-task binary question. This is D'Mello's behavioral measure, so it is
 * answered without feedback — the participant is never told whether they were
 * right, which would contaminate later trials.
 */
export function ForcedChoice({ prompt, choices, onAnswer }: Props) {
  const theme = useTheme();
  const [answered, setAnswered] = useState<string | null>(null);

  function choose(value: string) {
    if (answered) return;
    setAnswered(value);
    onAnswer(value);
  }

  return (
    <View style={styles.root}>
      <ThemedText type="smallBold">{SPEAKER_LABELS.tutor}</ThemedText>
      <ThemedText style={styles.prompt}>{prompt}</ThemedText>
      <View style={styles.choices}>
        {choices.map((choice) => {
          const selected = answered === choice;
          return (
            <TouchableOpacity
              key={choice}
              disabled={!!answered}
              onPress={() => choose(choice)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!answered }}
              style={[
                styles.choice,
                {
                  borderColor: theme.text,
                  backgroundColor: selected ? theme.text : 'transparent',
                  opacity: answered && !selected ? 0.4 : 1,
                },
              ]}>
              <ThemedText style={{ color: selected ? theme.background : theme.text }}>
                {choice}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two, marginTop: Spacing.two },
  prompt: { marginBottom: Spacing.one },
  choices: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  choice: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
});
