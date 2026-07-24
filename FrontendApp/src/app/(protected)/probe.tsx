import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Probe } from '@/components/experiment/probe';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * The "after task" probe route. Same <Probe> component as the during-task
 * overlay, here shown as a full screen in the flow sequence.
 */
export default function ProbeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Probe timing="after" onDone={() => router.push('/posttest')} />
        </View>
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
  },
  center: { flex: 1, justifyContent: 'center' },
});
