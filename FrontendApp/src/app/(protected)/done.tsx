/**
 * The end of the session — a thank-you and an invitation, not a gate.
 *
 * Data is sent as it is produced, so by the time anyone reaches this screen
 * everything they consented to has already left. There is nothing here to
 * approve. What there is: an offer to share more than they originally agreed to,
 * now that they know what the study actually involved.
 *
 * The offer only runs one way. A category already sent cannot be recalled — see
 * consent.ts, where `setConsent` refuses to turn off anything in `submitted`, so
 * the illegal state is unreachable rather than merely discouraged.
 *
 * This is also where capture stops. The task is over, and leaving the camera
 * open would keep the browser's recording indicator lit for no reason.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCamera } from '@/experiment/camera';
import { DATA_CATEGORIES, DATA_CATEGORY_LABELS, type DataCategory } from '@/experiment/config';
import { setConsent, submissionStatus, submit } from '@/experiment/consent';
import { persist } from '@/experiment/persistence';
import { useSession } from '@/experiment/session';
import { useTheme } from '@/hooks/use-theme';

export default function DoneScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update, reset } = useSession();
  const { status: cameraStatus, stopRecording } = useCamera();
  const [offered, setOffered] = useState<DataCategory[]>([]);

  useEffect(() => {
    if (cameraStatus === 'recording') void stopRecording();
  }, [cameraStatus, stopRecording]);

  // Reaching this screen *is* the fact that the consented data was sent, so the
  // record catches up with what already happened.
  useEffect(() => {
    update((s) => ({ ...s, consent: submit(s.consent) }));
  }, [update]);

  const shared = session.consent.submitted;
  const remaining = DATA_CATEGORIES.filter((cat) => !session.consent.current.includes(cat));
  const status = submissionStatus(session.consent);

  function toggleOffer(cat: DataCategory) {
    setOffered((o) => (o.includes(cat) ? o.filter((c) => c !== cat) : [...o, cat]));
  }

  function shareMore() {
    if (offered.length === 0) return;

    update((s) => {
      const widened = offered.reduce((c, cat) => setConsent(c, cat, true), s.consent);
      return { ...s, consent: submit(widened, offered) };
    });
    persist(session, { kind: 'consent', added: offered });
    setOffered([]);
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            Done
          </ThemedText>
          <ThemedText type="title">Nice work — that&apos;s everything</ThemedText>
          <ThemedText themeColor="textSecondary">
            Thanks for sitting through it. Your session is recorded and there is nothing else you
            need to do.
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              WHAT YOU SHARED
            </ThemedText>
            {shared.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing — you chose not to share any data from this session.
              </ThemedText>
            ) : (
              shared.map((cat) => (
                <ThemedText key={cat} type="small">
                  {'✓'}  {DATA_CATEGORY_LABELS[cat]}
                </ThemedText>
              ))
            )}
          </ThemedView>

          {remaining.length > 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                WANT TO HELP MORE?
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Now that you have seen what the study involves, you can share more than you
                originally agreed to. Entirely optional — and once shared, an item can&apos;t be
                taken back.
              </ThemedText>

              {remaining.map((cat) => {
                const on = offered.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => toggleOffer(cat)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[
                      styles.option,
                      { borderColor: theme.text, backgroundColor: on ? theme.text : 'transparent' },
                    ]}>
                    <ThemedText type="small" style={{ color: on ? theme.background : theme.text }}>
                      {DATA_CATEGORY_LABELS[cat]}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                disabled={offered.length === 0}
                onPress={shareMore}
                accessibilityRole="button"
                accessibilityState={{ disabled: offered.length === 0 }}
                style={[
                  styles.button,
                  { backgroundColor: theme.text, opacity: offered.length === 0 ? 0.3 : 1 },
                ]}>
                <ThemedText style={[styles.buttonText, { color: theme.background }]}>
                  Share these too
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              You shared everything the study collects. Thank you — that is genuinely the most
              useful kind of session we get.
            </ThemedText>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            Sharing status: {status}
          </ThemedText>
        </View>

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
    justifyContent: 'space-between',
  },
  content: { gap: Spacing.two, flexShrink: 1 },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three, marginTop: Spacing.two },
  option: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
