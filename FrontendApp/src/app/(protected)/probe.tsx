/**
 * The retrospective arm: probes come after the whole task, once per case study.
 * The participant no longer has the material on screen, so each case study is
 * re-presented by its cueSummary before its probe.
 *
 * Participants in the immediate arm answer during the task and never land here.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Probe, type ProbeAnswers } from '@/components/experiment/probe';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { persist } from '@/experiment/persistence';
import { useSession } from '@/experiment/session';
import { useCaptureMarks } from '@/experiment/use-capture-marks';
import { useExperimentData } from '@/experiment/use-experiment-data';

export default function RetrospectiveProbeScreen() {
  const router = useRouter();
  const { session, update } = useSession();
  const { data, error } = useExperimentData();
  const mark = useCaptureMarks();
  const [index, setIndex] = useState(0);

  // Matters more here than in the immediate arm: a retrospective probe asks
  // about a window that has already closed, so when it was *shown* is the only
  // record of how much time sat between the experience and the report.
  const shownCaseStudyId = data?.caseStudy.id;
  useEffect(() => {
    if (shownCaseStudyId) mark('probeOnset', shownCaseStudyId);
  }, [shownCaseStudyId, mark]);

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

  // One case study today; this walks the list once the other seven exist.
  const caseStudies = [data.caseStudy];
  const caseStudy = caseStudies[index];

  function record(answers: ProbeAnswers) {
    const responses = Object.entries(answers).map(([questionId, value]) => ({
      caseStudyId: caseStudy.id,
      questionId,
      value,
      respondedAt: Date.now(),
    }));

    update((s) => ({ ...s, probes: [...s.probes, ...responses] }));
    persist(session, { kind: 'probes', timing: 'retrospective', responses });

    if (index + 1 < caseStudies.length) setIndex((i) => i + 1);
    else router.push('/posttest');
  }

  const questions = session.assignment.probeOrder
    .map((id) => data.probeQuestions[id])
    .filter(Boolean);

  const cue =
    caseStudy.cueSummary ??
    `the study on ${caseStudy.topic.replace(/_/g, ' ')} that you and the agents worked through`;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {caseStudies.length > 1 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.progress}>
            Looking back {'·'} {index + 1} of {caseStudies.length}
          </ThemedText>
        ) : null}
        <View style={styles.center}>
          <Probe
            key={caseStudy.id}
            timing="retrospective"
            questions={questions}
            context={{
              heading: 'Think back to',
              body: `${cue}.`,
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
