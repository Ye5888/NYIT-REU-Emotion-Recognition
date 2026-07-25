/**
 * The retrospective arm: after the task, the participant answers the same probe
 * set once per trial, with the trial re-presented so they know which moment is
 * being asked about. Participants in the immediate arm never reach this screen.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Probe, type ProbeAnswers } from '@/components/experiment/probe';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { SPEAKER_LABELS } from '@/experiment/config';
import { useSession } from '@/experiment/session';
import { useExperimentData } from '@/experiment/use-experiment-data';
import { utteranceFor, type Condition } from '@/experiment/types';

export default function RetrospectiveProbeScreen() {
  const router = useRouter();
  const { session, update } = useSession();
  const { data, error } = useExperimentData();
  const [trialIndex, setTrialIndex] = useState(0);

  if (error || !data) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          {error ? (
            <ThemedText type="small" themeColor="textSecondary">
              {error.message}
            </ThemedText>
          ) : (
            <ActivityIndicator />
          )}
        </SafeAreaView>
      </ThemedView>
    );
  }

  const trial = data.trials[trialIndex];
  const condition = data.condition as Condition;

  const disagreement = trial.assertions
    .map((a) => `${SPEAKER_LABELS[a.speaker]}: "${utteranceFor(a, condition)}"`)
    .join('\n');

  function record(answers: ProbeAnswers) {
    update((s) => ({
      ...s,
      probes: [
        ...s.probes,
        ...Object.entries(answers).map(([questionId, value]) => ({
          trialId: trial.id,
          questionId,
          value,
          respondedAt: Date.now(),
        })),
      ],
    }));

    if (trialIndex + 1 < data!.trials.length) setTrialIndex((i) => i + 1);
    else router.push('/posttest');
  }

  const questions = session.assignment.probeOrder
    .map((id) => data.probeQuestions[id])
    .filter(Boolean);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.progress}>
          Looking back {'·'} {trialIndex + 1} of {data.trials.length}
        </ThemedText>
        <View style={styles.center}>
          <Probe
            key={trial.id}
            timing="retrospective"
            questions={questions}
            context={{
              heading: `When you were asked: "${trial.forcedChoicePrompt}"`,
              body: disagreement,
            }}
            onDone={record}
          />
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
    paddingVertical: Spacing.three,
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  progress: { paddingBottom: Spacing.two },
  center: { flex: 1, justifyContent: 'center' },
});
