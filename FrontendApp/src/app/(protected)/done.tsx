/**
 * The end of the session — a thank-you and an invitation, not a gate.
 *
 * Data is sent as it is produced, so by the time anyone reaches this screen
 * everything they consented to has already left. There is nothing here to
 * approve. What there is: an offer to share more than they first agreed to, now
 * that they know what the study actually involved.
 *
 * It is the same choices component as the consent screen, with a floor under it.
 * Anything already sent is locked, so the only available moves are upward — see
 * consent.ts, where `setConsent` refuses to turn off anything in `submitted`, so
 * the illegal state is unreachable rather than merely discouraged.
 *
 * This is also where capture stops.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsentChoices } from '@/components/experiment/consent-choices';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DATA_CATEGORIES, DATA_CATEGORY_LABELS } from '@/experiment/config';
import { pendingCategories, submissionStatus, submit } from '@/experiment/consent';
import { useCamera } from '@/experiment/camera';
import { persist } from '@/experiment/persistence';
import { useSession } from '@/experiment/session';
import { useTheme } from '@/hooks/use-theme';

export default function DoneScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update, reset } = useSession();
  const { stopRecording, release } = useCamera();
  const settled = useRef(false);

  // Both calls, in this order. Stopping the recorder ends the capture; only
  // releasing the stream hands the device back and turns the indicator light
  // off. Stopping alone leaves the light on for the rest of the browser session.
  useEffect(() => {
    void (async () => {
      await stopRecording();
      release();
    })();
  }, [stopRecording, release]);

  // Reaching this screen *is* the fact that the consented data was sent, so the
  // record catches up with what already happened. Guarded because it must not
  // re-run over the widening the participant may do below.
  useEffect(() => {
    if (settled.current) return;
    settled.current = true;
    update((s) => ({ ...s, consent: submit(s.consent) }));
  }, [update]);

  const shared = session.consent.submitted;
  const pending = pendingCategories(session.consent);
  const everything = shared.length === DATA_CATEGORIES.length;

  function shareMore() {
    if (pending.length === 0) return;
    update((s) => ({ ...s, consent: submit(s.consent) }));
    persist(session, { kind: 'consent', added: pending });
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.intro}>
          <ThemedText type="small" themeColor="textSecondary">
            Done
          </ThemedText>
          <ThemedText type="title">Nice work — that&apos;s everything</ThemedText>
          <ThemedText themeColor="textSecondary">
            Thanks for sitting through it. There is nothing else you need to do.
          </ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              WHAT YOU SHARED
            </ThemedText>
            {shared.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing from this session was kept.
              </ThemedText>
            ) : (
              shared.map((cat) => (
                <ThemedText key={cat} type="small">
                  {'✓'}  {DATA_CATEGORY_LABELS[cat]}
                </ThemedText>
              ))
            )}
          </ThemedView>

          {everything ? (
            <ThemedText type="small" themeColor="textSecondary">
              You shared everything the study collects. Thank you — that is genuinely the most
              useful kind of session we get.
            </ThemedText>
          ) : (
            <>
              <ThemedText type="smallBold">Want to help more?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Now that you have seen what the study involves, you can share more than you first
                agreed to. Entirely optional.
              </ThemedText>

              <ConsentChoices
                consent={session.consent}
                onChange={(consent) => update({ consent })}
              />

              <TouchableOpacity
                disabled={pending.length === 0}
                onPress={shareMore}
                accessibilityRole="button"
                accessibilityState={{ disabled: pending.length === 0 }}
                style={[
                  styles.button,
                  { backgroundColor: theme.text, opacity: pending.length === 0 ? 0.3 : 1 },
                ]}>
                <ThemedText style={[styles.buttonText, { color: theme.background }]}>
                  Share these too
                </ThemedText>
              </TouchableOpacity>
            </>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            Sharing status: {submissionStatus(session.consent)}
          </ThemedText>
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.text }]}
          onPress={() => {
            reset();
            router.push('/');
          }}
          accessibilityRole="button">
          <ThemedText style={[styles.buttonText, { color: theme.background }]}>
            Start over (reset session)
          </ThemedText>
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
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
