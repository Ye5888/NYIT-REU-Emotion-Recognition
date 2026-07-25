/**
 * The learning task: one case study critiqued across its trials.
 *
 * Each trial runs advance turn → peer/tutor assertions → forced choice. Which
 * variant of each assertion is spoken comes from the session's condition; the
 * forced choice's correct answer does not, since the agents' claims vary but
 * the facet's ground truth does not.
 */
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DialogueTurn } from '@/components/experiment/dialogue-turn';
import { ForcedChoice } from '@/components/experiment/forced-choice';
import { Probe, type ProbeAnswers } from '@/components/experiment/probe';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/experiment/session';
import { useExperimentData } from '@/experiment/use-experiment-data';
import { utteranceFor, type Condition, type Speaker } from '@/experiment/types';
import { useTheme } from '@/hooks/use-theme';

export default function TaskScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update } = useSession();
  const { data, error } = useExperimentData();

  const [reading, setReading] = useState(true);
  const [trialIndex, setTrialIndex] = useState(0);
  const [step, setStep] = useState(0); // turns revealed in the current trial
  const [probing, setProbing] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const trial = data?.trials[trialIndex];
  const condition = data?.condition as Condition | undefined;

  /** Everything said so far: completed trials in full, current trial up to `step`. */
  const transcript = useMemo(() => {
    if (!data || !condition) return [];
    const lines: { key: string; speaker: Speaker; text: string }[] = [];

    data.trials.forEach((t, i) => {
      if (i > trialIndex) return;
      const limit = i < trialIndex ? 1 + t.assertions.length : step;

      if (limit > 0) {
        lines.push({ key: `${t.id}-advance`, speaker: t.advanceTurn.speaker, text: t.advanceTurn.text });
      }
      t.assertions.forEach((assertion, j) => {
        if (limit > j + 1) {
          lines.push({
            key: `${t.id}-a${j}`,
            speaker: assertion.speaker,
            text: utteranceFor(assertion, condition),
          });
        }
      });
    });

    return lines;
  }, [data, condition, trialIndex, step]);

  if (error) {
    return (
      <Centered>
        <ThemedText type="smallBold">Could not load the task</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {error.message}
        </ThemedText>
      </Centered>
    );
  }

  if (!data || !trial || !condition) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  const turnsInTrial = 1 + trial.assertions.length;
  const awaitingChoice = step >= turnsInTrial;

  function advance() {
    setStep((s) => s + 1);
    requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
  }

  function answer(value: string) {
    update((s) => ({
      ...s,
      forcedChoices: [
        ...s.forcedChoices,
        {
          trialId: trial!.id,
          caseStudyId: trial!.caseStudyId,
          value,
          correct: value === trial!.correctKey,
          respondedAt: Date.now(),
        },
      ],
    }));

    if (session.assignment.probeTiming === 'immediate') setProbing(true);
    else nextTrial();
  }

  function recordProbe(answers: ProbeAnswers) {
    update((s) => ({
      ...s,
      probes: [
        ...s.probes,
        ...Object.entries(answers).map(([questionId, value]) => ({
          trialId: trial!.id,
          questionId,
          value,
          respondedAt: Date.now(),
        })),
      ],
    }));
    setProbing(false);
    nextTrial();
  }

  function nextTrial() {
    if (trialIndex + 1 < data!.trials.length) {
      setTrialIndex((i) => i + 1);
      setStep(0);
    } else {
      router.push(session.assignment.probeTiming === 'retrospective' ? '/probe' : '/posttest');
    }
  }

  const probeQuestions = session.assignment.probeOrder
    .map((id) => data.probeQuestions[id])
    .filter(Boolean);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="small" themeColor="textSecondary">
            {data.caseStudy.topic.replace(/_/g, ' ')} {'·'} trial {trialIndex + 1} of{' '}
            {data.trials.length}
          </ThemedText>
        </View>

        <ScrollView ref={scroller} contentContainerStyle={styles.scroll}>
          <ThemedView type="backgroundElement" style={styles.study}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              THE STUDY
            </ThemedText>
            <ThemedText>{data.caseStudy.studyText}</ThemedText>
          </ThemedView>

          {!reading ? (
            <View style={styles.dialogue}>
              {transcript.map((line) => (
                <DialogueTurn key={line.key} speaker={line.speaker} text={line.text} />
              ))}

              {awaitingChoice ? (
                <ForcedChoice
                  key={trial.id}
                  prompt={trial.forcedChoicePrompt}
                  choices={trial.choices}
                  onAnswer={answer}
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {reading ? (
          <PrimaryButton label="I've read the study" onPress={() => setReading(false)} />
        ) : !awaitingChoice ? (
          <PrimaryButton label="Continue" onPress={advance} />
        ) : null}
      </SafeAreaView>

      {probing ? (
        <View style={styles.overlay}>
          <View style={styles.overlayInner}>
            <Probe timing="immediate" questions={probeQuestions} onDone={recordProbe} />
          </View>
        </View>
      ) : null}
    </ThemedView>
  );

  function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.text }]}
        onPress={onPress}
        accessibilityRole="button">
        <ThemedText style={[styles.buttonText, { color: theme.background }]}>{label}</ThemedText>
      </TouchableOpacity>
    );
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={[styles.safe, styles.centered]}>{children}</SafeAreaView>
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
  centered: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  header: { paddingBottom: Spacing.two },
  scroll: { paddingBottom: Spacing.four },
  study: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  dialogue: { marginTop: Spacing.four },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  overlayInner: { width: '100%', maxWidth: 480 },
});
