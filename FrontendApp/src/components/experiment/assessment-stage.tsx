/**
 * Shared shell for the three assessment stages. Pretest, posttest and transfer
 * are the same instrument pointed at different item sets, so they share one
 * screen body and differ only in copy and in where they advance to.
 *
 * This is also the flush point for the stage: responses go into the session and
 * out to the backend in the same place, and the participant advances whether or
 * not the write succeeds.
 */
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Assessment } from '@/components/experiment/assessment';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { persist } from '@/experiment/persistence';
import { useSession } from '@/experiment/session';
import { useAssessmentItems } from '@/experiment/use-assessment-items';
import type { AssessmentItem, AssessmentResponse } from '@/experiment/types';

interface Props {
  stage: AssessmentItem['stage'];
  step: string;
  title: string;
  blurb: string;
  next: Href;
  continueLabel?: string;
  finalLabel?: string;
}

export function AssessmentStageScreen({
  stage,
  step,
  title,
  blurb,
  next,
  continueLabel,
  finalLabel,
}: Props) {
  const router = useRouter();
  const { session, update } = useSession();
  const { items, error } = useAssessmentItems(session.protocolVersion, stage);

  function record(responses: AssessmentResponse[]) {
    update((s) => ({ ...s, assessments: [...s.assessments, ...responses] }));
    persist(session, { kind: 'assessments', stage, responses });
    router.push(next);
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.intro}>
          <ThemedText type="small" themeColor="textSecondary">
            {step}
          </ThemedText>
          <ThemedText type="title">{title}</ThemedText>
          <ThemedText themeColor="textSecondary">{blurb}</ThemedText>
        </View>

        <View style={styles.center}>
          {error ? (
            <ThemedText type="small" themeColor="textSecondary">
              {error.message}
            </ThemedText>
          ) : items ? (
            <Assessment
              items={items}
              onDone={record}
              continueLabel={continueLabel}
              finalLabel={finalLabel}
            />
          ) : (
            <ActivityIndicator />
          )}
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
    paddingVertical: Spacing.four,
  },
  intro: { gap: Spacing.two },
  center: { flex: 1, justifyContent: 'center' },
});
