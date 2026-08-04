/**
 * Consent — how much analysis happens on this device, chosen before capture.
 *
 * Not a share/don't-share question. Every session sends its model updates and
 * its interaction record; those are what the study is made of. The choice is how
 * raw the material is when it leaves: analysed here and discarded, measurements
 * only, or the footage itself.
 *
 * This screen sets intent only. It writes `session.consent.current` and makes no
 * network call: the record of what actually left the device is written by the
 * data path as data leaves, not by a participant pressing Continue here.
 *
 * The copy does not say data is held until the end. It isn't — responses are
 * sent as they are produced, and a session abandoned halfway has already sent
 * what it collected. The end screen is a thank-you and an offer to go deeper,
 * never a gate and never a way to take something back.
 */
import { useRouter } from 'expo-router';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsentChoices } from '@/components/experiment/consent-choices';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { persist } from '@/experiment/persistence';
import { useSession } from '@/experiment/session';
import { useTheme } from '@/hooks/use-theme';

export default function ConsentScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update } = useSession();

  // The session document is created here, not at the first response: this is the
  // earliest point where the participant has agreed to anything, and a run that
  // exists from the outset is one whose abandonment is visible later.
  function begin() {
    persist(session, { kind: 'sessionStart' });
    router.push('/pretest');
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.intro}>
          <ThemedText type="small" themeColor="textSecondary">
            Consent
          </ThemedText>
          <ThemedText type="title">Where your video is analysed</ThemedText>
          <ThemedText themeColor="textSecondary">
            Your webcam runs during the task — that is how the task works. What you choose here is
            how much of the analysis happens on your own computer before anything is sent. It
            applies from the moment you begin.
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ConsentChoices
            consent={session.consent}
            onChange={(consent) => update({ consent })}
          />

          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            Whichever you pick, your answers and the results of the analysis are sent — that is
            what the study is. You can choose to send more at the end; anything already sent
            can&apos;t be taken back.
          </ThemedText>
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.text }]}
          onPress={begin}
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
