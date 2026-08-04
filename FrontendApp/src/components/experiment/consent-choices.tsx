/**
 * The processing-depth choice, used by both the consent screen and the end
 * screen.
 *
 * One component rather than two because the choice is the same choice — the end
 * screen is the consent screen with a floor under it. Anything already sent is
 * locked, so the only available move is deeper. Passing that floor in as data,
 * rather than writing a second read-only variant, means the two screens cannot
 * drift apart about what the participant agreed to.
 *
 * A ladder, not checkboxes: each rung includes those below it, so exactly one is
 * selected at a time. There is no "share nothing" rung — that is not a session
 * worth running, and the floor is enforced in consent.ts rather than here.
 */
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { DATA_CATEGORY_BLURBS, DATA_CATEGORY_LABELS, VIDEO_TIERS } from '@/experiment/config';
import { setVideoTier, videoTier, videoTierFloor } from '@/experiment/consent';
import type { ConsentState } from '@/experiment/types';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  consent: ConsentState;
  onChange: (next: ConsentState) => void;
}

export function ConsentChoices({ consent, onChange }: Props) {
  const selected = videoTier(consent);
  const floor = videoTierFloor(consent);

  return (
    <View style={styles.group}>
      {VIDEO_TIERS.map((tier, i) => (
        <Option
          key={tier}
          label={DATA_CATEGORY_LABELS[tier]}
          blurb={DATA_CATEGORY_BLURBS[tier]}
          selected={selected === i}
          locked={i < floor}
          onPress={() => onChange(setVideoTier(consent, i))}
        />
      ))}
    </View>
  );
}

function Option({
  label,
  blurb,
  selected,
  locked,
  onPress,
}: {
  label: string;
  blurb: string;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={locked ? undefined : onPress}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: locked }}
      style={[
        styles.option,
        {
          borderColor: selected ? theme.text : theme.textSecondary,
          borderWidth: selected ? 2 : 1,
          opacity: locked ? 0.45 : 1,
        },
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {blurb}
      </ThemedText>
      {locked ? (
        <ThemedText type="small" themeColor="textSecondary">
          Already shared — this can&apos;t be taken back.
        </ThemedText>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  option: {
    gap: Spacing.one,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
