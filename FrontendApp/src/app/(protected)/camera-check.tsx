/**
 * Framing check — the last screen before the task.
 *
 * Two jobs. First, make sure the face is actually in frame: badly framed video
 * is unusable to the expression pipeline, and it is far cheaper to find that out
 * here than after the session. Second, say plainly when recording starts.
 *
 * Recording deliberately does NOT start on this screen. Nobody needs footage of
 * a participant tilting their laptop lid and fixing their hair, and telling them
 * exactly when capture begins costs nothing and is the honest thing to do.
 *
 * There is no "continue without video" path: every disclosure tier the consent
 * screen offers — raw video, facial parameters, model parameters — is derived
 * from this recording, so a session without it has nothing to contribute.
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraPreview } from '@/components/experiment/camera-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCamera } from '@/experiment/camera';
import { persist } from '@/experiment/persistence';
import { useSession } from '@/experiment/session';
import { useTheme } from '@/hooks/use-theme';

export default function CameraCheckScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update } = useSession();
  const { status, message, acquire, beginRecording } = useCamera();

  useEffect(() => {
    if (status === 'idle') void acquire();
  }, [status, acquire]);

  function start() {
    const startedAt = beginRecording();
    update({ recordingStartedAt: startedAt });
    // The clock every other timestamp is measured against — worth persisting the
    // moment it exists rather than at the end, since a run may not reach the end.
    if (startedAt) {
      persist(session, { kind: 'sessionPatch', patch: { captures: { recordingStartedAt: startedAt } } });
    }
    router.push('/task');
  }

  const live = status === 'ready' || status === 'recording';

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.intro}>
          <ThemedText type="small" themeColor="textSecondary">
            Step 2 · Camera
          </ThemedText>
          <ThemedText type="title">Check your camera</ThemedText>
          <ThemedText themeColor="textSecondary">
            Your face needs to stay in view for the whole task. Sit so your whole face is inside
            the frame below, with your screen at a comfortable distance.
          </ThemedText>
        </View>

        <View style={styles.center}>
          {status === 'unavailable' ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">The camera could not be opened</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {message ?? 'Something went wrong opening the camera.'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                The task records video, so it can&apos;t start without it. Allow camera access in
                your browser, then try again.
              </ThemedText>
            </ThemedView>
          ) : live ? (
            <CameraPreview />
          ) : (
            <ActivityIndicator />
          )}
        </View>

        {status === 'unavailable' ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.text }]}
            onPress={() => void acquire()}
            accessibilityRole="button">
            <ThemedText style={[styles.buttonText, { color: theme.background }]}>
              Try again
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              Recording starts when you press Continue, and runs until the task is over.
            </ThemedText>
            <TouchableOpacity
              disabled={!live}
              onPress={start}
              accessibilityRole="button"
              accessibilityState={{ disabled: !live }}
              style={[styles.button, { backgroundColor: theme.text, opacity: live ? 1 : 0.3 }]}>
              <ThemedText style={[styles.buttonText, { color: theme.background }]}>
                Continue
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
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
  intro: { gap: Spacing.two },
  center: { flex: 1, justifyContent: 'center' },
  card: { gap: Spacing.two, padding: Spacing.four, borderRadius: Spacing.three },
  footer: { gap: Spacing.two },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
