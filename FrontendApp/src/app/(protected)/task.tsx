/**
 * The learning task: one case study critiqued across its trials.
 *
 * A trial reveals one thing per press — advance turn, peer assertion, tutor
 * assertion, then the forced choice. Which utterance each agent speaks comes
 * from the session's condition; the forced choice's correct answer does not,
 * since the agents' claims vary but the facet's ground truth does not.
 *
 * Everything said stays on screen, including the participant's own answers, so
 * the trialogue reads as one accumulating conversation.
 */
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DialogueTurn, type TurnSpeaker } from '@/components/experiment/dialogue-turn';
import { ForcedChoice } from '@/components/experiment/forced-choice';
import { Probe, type ProbeAnswers } from '@/components/experiment/probe';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/experiment/session';
import { useExperimentData } from '@/experiment/use-experiment-data';
import { utteranceFor, type Condition } from '@/experiment/types';
import { useTheme } from '@/hooks/use-theme';

interface Line {
  key: string;
  speaker: TurnSpeaker;
  text: string;
}

export default function TaskScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, update } = useSession();
  const { data, error } = useExperimentData();

  const [trialIndex, setTrialIndex] = useState(0);
  const [step, setStep] = useState(0); // how much of the current trial is revealed
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [probing, setProbing] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const trial = data?.trials[trialIndex];
  const condition = data?.condition as Condition | undefined;

  const transcript = useMemo<Line[]>(() => {
    if (!data || !condition) return [];
    const lines: Line[] = [];

    data.trials.forEach((t, i) => {
      if (i > trialIndex) return;
      const turns = 1 + t.assertions.length;
      const shown = i < trialIndex ? turns : Math.min(step, turns);

      if (shown > 0) {
        lines.push({ key: `${t.id}-advance`, speaker: t.advanceTurn.speaker, text: t.advanceTurn.text });
      }
      t.assertions.forEach((assertion, j) => {
        if (shown > j + 1) {
          lines.push({
            key: `${t.id}-a${j}`,
            speaker: assertion.speaker,
            text: utteranceFor(assertion, condition),
          });
        }
      });

      const answer = answers[t.id];
      if (answer) {
        lines.push({ key: `${t.id}-answer`, speaker: 'participant', text: answer });
      }
    });

    return lines;
  }, [data, condition, trialIndex, step, answers]);

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
  const questionShown = step > turnsInTrial;
  const answered = !!answers[trial.id];

  function reveal() {
    setStep((s) => s + 1);
    requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
  }

  function submitAnswer(value: string) {
    setAnswers((a) => ({ ...a, [trial!.id]: value }));
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

    if (trialIndex + 1 < data!.trials.length) {
      setTrialIndex((i) => i + 1);
      setStep(0);
      requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
    } else if (session.assignment.probeTiming === 'immediate') {
      setProbing(true);
    } else {
      router.push('/probe');
    }
  }

  function recordProbe(probeAnswers: ProbeAnswers) {
    update((s) => ({
      ...s,
      probes: [
        ...s.probes,
        ...Object.entries(probeAnswers).map(([questionId, value]) => ({
          caseStudyId: data!.caseStudy.id,
          questionId,
          value,
          respondedAt: Date.now(),
        })),
      ],
    }));
    setProbing(false);
    router.push('/posttest');
  }

  const probeQuestions = session.assignment.probeOrder
    .map((id) => data.probeQuestions[id])
    .filter(Boolean);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.header}>
          {data.caseStudy.topic.replace(/_/g, ' ')} {'·'} trial {trialIndex + 1} of{' '}
          {data.trials.length}
        </ThemedText>

        <ScrollView ref={scroller} contentContainerStyle={styles.scroll}>
          <ThemedView type="backgroundElement" style={styles.study}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              THE STUDY
            </ThemedText>
            <ThemedText>{data.caseStudy.studyText}</ThemedText>
          </ThemedView>

          <View style={styles.dialogue}>
            {transcript.map((line) => (
              <DialogueTurn key={line.key} speaker={line.speaker} text={line.text} />
            ))}

            {questionShown && !answered ? (
              <ForcedChoice
                key={trial.id}
                prompt={trial.forcedChoicePrompt}
                choices={trial.choices}
                onSubmit={submitAnswer}
              />
            ) : null}
          </View>
        </ScrollView>

        {!questionShown ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.text }]}
            onPress={reveal}
            accessibilityRole="button">
            <ThemedText style={[styles.buttonText, { color: theme.background }]}>Continue</ThemedText>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>

      {probing ? (
        <View style={styles.overlay}>
          <View style={styles.overlayInner}>
            <Probe
              timing="immediate"
              questions={probeQuestions}
              onDone={recordProbe}
            />
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
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
