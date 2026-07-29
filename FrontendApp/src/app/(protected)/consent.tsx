/**
 * Consent — what we may keep, chosen before anything is captured.
 *
 * This screen sets intent only. It writes `session.consent.current` and makes no
 * network call: the record of what actually left the device is written by the
 * data path as data leaves, not by a participant pressing Continue here.
 *
 * The copy no longer says data is held until the end. It isn't — responses are
 * sent as they are produced, and a session that is abandoned halfway has already
 * sent what it collected. The end screen is a thank-you and an offer to widen
 * this choice, never a gate and never a way to take something back.
 */
import { useRouter } from 'expo-router';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsentChoices } from '@/components/experiment/consent-choices';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/experiment/session';
import { useTheme } from '@/hooks/use-theme';

export default function ConsentScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update } = useSession();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.intro}>
          <ThemedText type="small" themeColor="textSecondary">
            Consent
          </ThemedText>
          <ThemedText type="title">What you&apos;re willing to share</ThemedText>
          <ThemedText themeColor="textSecondary">
            Your webcam runs during the task either way — it&apos;s how the task works. What you
            choose here is how much of it we may keep, and it applies from the moment you begin.
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ConsentChoices
            consent={session.consent}
            onChange={(consent) => update({ consent })}
          />

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            You can change your mind and share more at the end. Anything already sent can&apos;t be
            taken back.
          </ThemedText>
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.text }]}
          onPress={() => router.push('/pretest')}
          accessibilityRole="button">
          <ThemedText style={[styles.buttonText, { color: theme.background }]}>Continue</ThemedText>
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
  },
  intro: { gap: Spacing.two, paddingBottom: Spacing.three },
  scroll: { gap: Spacing.three, paddingBottom: Spacing.three },
  note: { paddingTop: Spacing.two },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
