import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProbeQuestion } from '@/experiment/types';

interface Props {
  question: ProbeQuestion;
  value: number | string | undefined;
  onChange: (value: number | string) => void;
}

export function ProbeQuestionInput({ question, value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <ThemedText>{question.prompt}</ThemedText>

      {question.responseType === 'scale' && question.scale ? (
        <Scale
          min={question.scale.min}
          max={question.scale.max}
          value={typeof value === 'number' ? value : undefined}
          onChange={onChange}
        />
      ) : null}

      {question.responseType === 'choice' && question.choices ? (
        <View style={styles.options}>
          {question.choices.map((choice) => {
            const selected = value === choice;
            return (
              <TouchableOpacity
                key={choice}
                onPress={() => onChange(choice)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.option,
                  {
                    borderColor: theme.text,
                    backgroundColor: selected ? theme.text : 'transparent',
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: selected ? theme.background : theme.text }}>
                  {choice}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {question.responseType === 'text' ? (
        <TextInput
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          multiline
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.textSecondary },
          ]}
          placeholderTextColor={theme.textSecondary}
          placeholder="Type your answer"
        />
      ) : null}
    </View>
  );
}

function Scale({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View style={styles.options}>
      {points.map((point) => {
        const selected = value === point;
        return (
          <TouchableOpacity
            key={point}
            onPress={() => onChange(point)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.point,
              {
                borderColor: theme.text,
                backgroundColor: selected ? theme.text : 'transparent',
              },
            ]}>
            <ThemedText style={{ color: selected ? theme.background : theme.text }}>
              {point}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  options: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  option: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  point: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    minWidth: 44,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
