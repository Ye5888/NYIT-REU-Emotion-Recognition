/**
 * Welcome screen.
 *
 * Three things this copy must not do, all for the same reason — the task only
 * works if the participant arrives without a frame already handed to them:
 *
 *   - Do not say the studies are flawed. Finding that out is the task. Saying
 *     it here converts discovery into confirmation and there is nothing left to
 *     be confused by.
 *   - Do not commit to a number of case studies. The protocol drives how many
 *     there are; today it is one, the design goes to eight.
 *   - Do not state a duration. It sets a clock against which people ration
 *     effort, and it would be wrong the moment the protocol changes.
 *
 * It also does not name the states under study. Telling participants up front
 * that we measure confusion or engagement primes exactly the self-reports the
 * design is trying to read cleanly. This one is in tension with IRB disclosure;
 * if the construct must be named, the debrief is the cheaper place for it.
 */
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  'A few questions about what you already know',
  'A camera check',
  'The main task, with two on-screen partners',
  'Some questions about how the task went',
  'A last set of questions, and you are done',
];

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            Welcome
          </ThemedText>
          <ThemedText type="title">A study about learning</ThemedText>
          <ThemedText themeColor="textSecondary">
            You will read about some published research and talk it over with two on-screen
            partners, deciding for yourself what you make of it.
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              WHAT HAPPENS
            </ThemedText>
            {STEPS.map((step, i) => (
              <ThemedText key={step} type="small">
                {i + 1}.  {step}
              </ThemedText>
            ))}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ABOUT THE RECORDING
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your webcam records while you work through the task. You choose what of it we may
              keep, and you will be told exactly when recording starts.
            </ThemedText>
          </ThemedView>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.text }]}
          onPress={() => router.push('/login')}
          accessibilityRole="button">
          <ThemedText style={[styles.buttonText, { color: theme.background }]}>Begin</ThemedText>
        </TouchableOpacity>
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
  content: { gap: Spacing.two, flexShrink: 1 },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three, marginTop: Spacing.two },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
