import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CameraProvider } from '@/experiment/camera';
import { SessionProvider } from '@/experiment/session';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout. The app is a single controlled, linear experiment session, so:
 *  - `headerShown: false`  — immersive; no nav chrome.
 *  - `gestureEnabled: false` — participants can't swipe back out of a step
 *    mid-trial. Controlled sequence = controlled data.
 *
 * Flow order (file-based routes): index → login → consent → pretest →
 * camera-check → task → probe → posttest → transfer → done.  Each screen
 * advances to the next.
 *
 * CameraProvider sits inside SessionProvider because the camera outlives the
 * screens that use it: the framing check opens it, the task records with it, and
 * neither may own it or unmounting would re-prompt for permission.
 *
 * `gestureEnabled: false` is also what enforces forward-only assessment: the
 * pretest must not be revisable once the task has taught the participant
 * something. See components/experiment/assessment.tsx.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <CameraProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <AnimatedSplashOverlay />
              <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
              <StatusBar style="auto" />
            </ThemeProvider>
          </CameraProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
