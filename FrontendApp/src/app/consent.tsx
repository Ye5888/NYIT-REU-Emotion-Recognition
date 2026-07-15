import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DATA_CATEGORIES, DATA_CATEGORY_LABELS } from '@/experiment/config';

export default function ConsentScreen() {
  const router = useRouter();

  return (
    <PlaceholderScreen
      step="Consent"
      title="What you'll share"
      blurb="You choose, per item, what data to share (Cao's privacy-by-design). Nothing leaves your device until you submit at the end — and once submitted, an item can't be taken back, though you can always share more."
      todos={[
        'Real per-category toggles → writes session.consent.current',
        'Explain capture vs submission (data leaves the device only on submit)',
        'Category list below is rendered from config.ts (single source of truth)',
      ]}
      continueLabel="Continue"
      onContinue={() => router.push('/pretest')}>
      <View style={styles.list}>
        {DATA_CATEGORIES.map((cat) => (
          <ThemedView key={cat} type="backgroundElement" style={styles.row}>
            <ThemedText type="small">{DATA_CATEGORY_LABELS[cat]}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              (toggle — TBD)
            </ThemedText>
          </ThemedView>
        ))}
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.one, marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
