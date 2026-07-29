import { AssessmentStageScreen } from '@/components/experiment/assessment-stage';

export default function PretestScreen() {
  return (
    <AssessmentStageScreen
      stage="pretest"
      step="Step 1 · Before the task"
      title="A few questions first"
      blurb="These check what you already know. Answer as best you can — a guess is fine, and you won't be told whether you were right."
      next="/camera-check"
      finalLabel="Continue"
    />
  );
}
