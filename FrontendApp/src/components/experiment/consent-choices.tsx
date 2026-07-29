/**
 * The sharing choices, used by both the consent screen and the end screen.
 *
 * One component rather than two because the choices are the same choices — the
 * end screen is the consent screen with a floor under it. Anything already sent
 * is locked, so the only available moves are upward. Passing that floor in as
 * data, rather than writing a second read-only variant, means the two screens
 * cannot drift apart in what they claim the participant agreed to.
 *
 * The video options are a ladder, not checkboxes: each rung includes the ones
 * below it, so exactly one is selected at a time. Interaction traces are not
 * derived from the recording, so they toggle on their own.
 */
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  DATA_CATEGORY_BLURBS,
  DATA_CATEGORY_LABELS,
  INDEPENDENT_CATEGORIES,
  VIDEO_TIERS,
} from '@/experiment/config';
import { setConsent, setVideoTier, videoTier, videoTierFloor } from '@/experiment/consent';
import type { ConsentState } from '@/experiment/types';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  consent: ConsentState;
  onChange: (next: ConsentState) => void;
}

const NOTHING_LABEL = 'Nothing from the recording';
const NOTHING_BLURB =
  'Your video is used to run the task and then discarded. Nothing derived from it is kept.';

export function ConsentChoices({ consent, onChange }: Props) {
  const selected = videoTier(consent);
  const floor = videoTierFloor(consent);

  return (
    <View style={styles.root}>
      <View style={styles.group}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          FROM YOUR RECORDING
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Each option includes everything above it. Pick as much or as little as you like.
        </ThemedText>

        <Option
          label={NOTHING_LABEL}
          blurb={NOTHING_BLURB}
          selected={selected === -1}
          locked={floor >= 0}
          onPress={() => onChange(setVideoTier(consent, -1))}
        />

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

      <View style={styles.group}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          SEPARATELY
        </ThemedText>
        {INDEPENDENT_CATEGORIES.map((cat) => {
          const on = consent.current.includes(cat);
          return (
            <Option
              key={cat}
              label={DATA_CATEGORY_LABELS[cat]}
              blurb={DATA_CATEGORY_BLURBS[cat]}
              selected={on}
              locked={consent.submitted.includes(cat)}
              onPress={() => onChange(setConsent(consent, cat, !on))}
            />
          );
        })}
      </View>
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
  root: { gap: Spacing.four },
  group: { gap: Spacing.two },
  option: {
    gap: Spacing.one,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
