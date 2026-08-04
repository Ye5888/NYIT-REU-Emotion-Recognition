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
import { persist, persistVideoFinalize, persistWholeVideo } from '@/experiment/persistence';
import { useSession } from '@/experiment/session';
import { useTheme } from '@/hooks/use-theme';

export default function DoneScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update, reset } = useSession();
  const { stopRecording, release } = useCamera();
  const settled = useRef(false);
  const recording = useRef<Blob | null>(null);
  // Captured on arrival, before the settle effect widens `submitted` — it has to
  // mean "was raw video agreed to during the session", not "is it agreed now".
  const streamedRawVideo = useRef(session.consent.current.includes('rawVideo'));

  // Both calls, in this order. Stopping the recorder ends the capture; only
  // releasing the stream hands the device back and turns the indicator light
  // off. Stopping alone leaves the light on for the rest of the browser session.
  //
  // The blob is kept in a ref because it may still be needed: a participant who
  // declined raw video streamed nothing, and can choose to send it below.
  useEffect(() => {
    void (async () => {
      const blob = await stopRecording();
      release();
      recording.current = blob;

      // Streaming happened only if raw video was agreed to up front, in which
      // case the parts are already up there and just need stitching.
      if (streamedRawVideo.current) persistVideoFinalize(session.sessionId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopRecording, release]);

  // Reaching this screen *is* the fact that the consented data was sent, so the
  // record catches up with what already happened, and the run closes: `status`
  // moves off `inProgress`, which is what distinguishes a finished session from
  // an abandoned one. Guarded because it must not re-run over the widening the
  // participant may do below.
  useEffect(() => {
    if (settled.current) return;
    settled.current = true;

    // Computed outside the updater: a state updater must stay pure, or React
    // calling it twice would enqueue the write twice.
    const consent = submit(session.consent);
    update({ consent });
    persist(session, {
      kind: 'sessionPatch',
      patch: { consent, status: 'complete', completedAt: Date.now(), marks: session.marks },
    });
    // Runs once on arrival; `session` is read for its value at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  const shared = session.consent.submitted;
  const pending = pendingCategories(session.consent);
  const everything = shared.length === DATA_CATEGORIES.length;

  function shareMore() {
    if (pending.length === 0) return;

    const consent = submit(session.consent);
    update({ consent });
    persist(session, { kind: 'sessionPatch', patch: { consent } });

    // Newly agreed to raw video, having streamed nothing during the session, so
    // the retained recording goes up now as a single part.
    const nowSharingRaw = pending.includes('rawVideo');
    if (nowSharingRaw && !streamedRawVideo.current && recording.current) {
      persistWholeVideo(session.sessionId, recording.current);
      streamedRawVideo.current = true;
    }
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
              WHAT WAS SENT
            </ThemedText>
            {shared.map((cat) => (
              <ThemedText key={cat} type="small">
                {'✓'}  {DATA_CATEGORY_LABELS[cat]}
              </ThemedText>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              {'✓'}  Your answers and timings
            </ThemedText>
          </ThemedView>

          {everything ? (
            <ThemedText type="small" themeColor="textSecondary">
              You sent everything the study can use. Thank you — that is genuinely the most useful
              kind of session we get.
            </ThemedText>
          ) : (
            <>
              <ThemedText type="smallBold">Want to help more?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Now that you have seen what the study involves, you can send more than you first
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
                  Send this too
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
