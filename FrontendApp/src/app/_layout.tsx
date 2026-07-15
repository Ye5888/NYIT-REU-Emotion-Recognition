import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider } from '@/experiment/session';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout. The app is a single controlled, linear experiment session, so:
 *  - `headerShown: false`  — immersive; no nav chrome.
 *  - `gestureEnabled: false` — participants can't swipe back out of a step
 *    mid-trial. Controlled sequence = controlled data.
 *
 * Flow order (file-based routes): index → login → consent → pretest → task →
 * probe → posttest → done.  Each screen advances to the next.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
            <StatusBar style="auto" />
          </ThemeProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
