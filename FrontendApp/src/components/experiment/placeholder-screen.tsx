/**
 * Shared layout for the shell's placeholder screens: a title, a blurb, a "what
 * will be built here" checklist, optional extra content, and a Continue button.
 * Replace individual screen bodies with real UI as each is implemented.
 */
import type { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  step: string;
  title: string;
  blurb: string;
  todos: string[];
  children?: ReactNode;
  onContinue?: () => void;
  continueLabel?: string;
}

export function PlaceholderScreen({
  step,
  title,
  blurb,
  todos,
  children,
  onContinue,
  continueLabel = 'Continue',
}: Props) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            {step}
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{blurb}</ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              TO BUILD HERE
            </ThemedText>
            {todos.map((t) => (
              <ThemedText key={t} type="small">
                {'•'}  {t}
              </ThemedText>
            ))}
          </ThemedView>

          {children}
        </View>

        {onContinue ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.text }]}
            onPress={onContinue}
            accessibilityRole="button">
            <ThemedText style={[styles.buttonText, { color: theme.background }]}>
              {continueLabel}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    justifyContent: 'space-between',
  },
  content: { gap: Spacing.three, flexShrink: 1 },
  title: { marginTop: Spacing.two },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
