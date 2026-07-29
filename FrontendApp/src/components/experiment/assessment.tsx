/**
 * Assessment items — the learning measure (pretest, posttest, transfer).
 *
 * One item at a time, forward-only, with no correctness feedback. Both
 * constraints are methodological rather than stylistic:
 *
 *   - Feedback on a pretest item teaches that item, contaminating the very
 *     baseline that posttest − pretest is meant to measure.
 *   - Letting a participant revisit an earlier answer lets knowledge acquired
 *     during the task leak backwards into the pretest, in a direction the
 *     analysis cannot detect afterwards.
 *
 * The root layout already sets `gestureEnabled: false`, closing the same door
 * at the navigation level. Do not add a back affordance here.
 *
 * A selection is still changeable *within* an item, before Continue — that is
 * answering, not revising, and it keeps a misclick from being unrecoverable.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AssessmentItem, AssessmentResponse } from '@/experiment/types';

interface Props {
  items: AssessmentItem[];
  /** Called once, with every response, when the last item is committed. */
  onDone: (responses: AssessmentResponse[]) => void;
  continueLabel?: string;
  finalLabel?: string;
}

export function Assessment({ items, onDone, continueLabel = 'Continue', finalLabel }: Props) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);

  const item = items[index];
  const last = index + 1 === items.length;

  function commit() {
    if (selected === undefined) return;

    const response: AssessmentResponse = {
      itemId: item.id,
      stage: item.stage,
      value: selected,
      correct: selected === item.correctKey,
      respondedAt: Date.now(),
    };

    const next = [...responses, response];

    // Scored here but never shown — see the header comment.
    if (last) {
      onDone(next);
      return;
    }

    setResponses(next);
    setSelected(undefined);
    setIndex((i) => i + 1);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        QUESTION {index + 1} OF {items.length}
      </ThemedText>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <ThemedText>{item.prompt}</ThemedText>

        <View style={styles.options}>
          {item.choices.map((choice) => {
            const isSelected = selected === choice;
            return (
              <TouchableOpacity
                key={choice}
                onPress={() => setSelected(choice)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.option,
                  {
                    borderColor: theme.text,
                    backgroundColor: isSelected ? theme.text : 'transparent',
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: isSelected ? theme.background : theme.text }}>
                  {choice}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity
        disabled={selected === undefined}
        onPress={commit}
        accessibilityRole="button"
        accessibilityState={{ disabled: selected === undefined }}
        style={[
          styles.button,
          { backgroundColor: theme.text, opacity: selected === undefined ? 0.3 : 1 },
        ]}>
        <ThemedText style={[styles.buttonText, { color: theme.background }]}>
          {last ? (finalLabel ?? continueLabel) : continueLabel}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    width: '100%',
    maxHeight: '90%',
  },
  body: { gap: Spacing.four, paddingBottom: Spacing.two },
  options: { gap: Spacing.two },
  option: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
