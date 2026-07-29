/**
 * The self-report probe (the team's term — "survey" is taken by the IRB
 * instrument). One question renderer, two presentations:
 *
 *   immediate      — fires after a trial's forced choice, context still on screen
 *   retrospective  — fires after every case study, so it must re-present the
 *                    trial it is asking about; `context` carries that
 *
 * Questions arrive already ordered by the participant's assignment.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ProbeQuestionInput } from '@/components/experiment/probe-question';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProbeQuestion, ProbeTiming } from '@/experiment/types';

export interface ProbeAnswers {
  [questionId: string]: number | string;
}

interface Props {
  timing: ProbeTiming;
  questions: ProbeQuestion[];
  context?: { heading: string; body: string };
  onDone: (answers: ProbeAnswers) => void;
}

export function Probe({ timing, questions, context, onDone }: Props) {
  const theme = useTheme();
  const [answers, setAnswers] = useState<ProbeAnswers>({});

  const complete = questions.every((q) => answers[q.id] !== undefined);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {timing === 'immediate' ? 'A QUICK CHECK-IN' : 'THINKING BACK'}
      </ThemedText>

      {context ? (
        <View style={styles.context}>
          <ThemedText type="smallBold">{context.heading}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {context.body}
          </ThemedText>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.questions} showsVerticalScrollIndicator={false}>
        {questions.map((q) => (
          <ProbeQuestionInput
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(value) => setAnswers((a) => ({ ...a, [q.id]: value }))}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        disabled={!complete}
        onPress={() => onDone(answers)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !complete }}
        style={[styles.button, { backgroundColor: theme.text, opacity: complete ? 1 : 0.3 }]}>
        <ThemedText style={[styles.buttonText, { color: theme.background }]}>
          {timing === 'immediate' ? 'Resume' : 'Continue'}
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
  context: { gap: Spacing.one },
  questions: { gap: Spacing.four, paddingBottom: Spacing.two },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
