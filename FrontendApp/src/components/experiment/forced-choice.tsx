import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SPEAKER_LABELS } from '@/experiment/config';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  prompt: string;
  choices: string[];
  onSubmit: (value: string) => void;
}

/**
 * The in-task binary question. Selecting only selects; Continue commits. No
 * feedback is given either way — the participant is never told whether they
 * were right, which would contaminate later trials.
 */
export function ForcedChoice({ prompt, choices, onSubmit }: Props) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <ThemedText type="smallBold">{SPEAKER_LABELS.tutor}</ThemedText>
      <ThemedText>{prompt}</ThemedText>

      <View style={styles.choices}>
        {choices.map((choice) => {
          const on = selected === choice;
          return (
            <TouchableOpacity
              key={choice}
              onPress={() => setSelected(choice)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[
                styles.choice,
                { borderColor: theme.text, backgroundColor: on ? theme.text : 'transparent' },
              ]}>
              <ThemedText style={{ color: on ? theme.background : theme.text }}>
                {choice}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        disabled={!selected}
        onPress={() => selected && onSubmit(selected)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !selected }}
        style={[styles.continue, { backgroundColor: theme.text, opacity: selected ? 1 : 0.3 }]}>
        <ThemedText style={[styles.continueText, { color: theme.background }]}>Continue</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two, marginTop: Spacing.two },
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
  continue: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  continueText: { fontSize: 16, fontWeight: '600' },
});
