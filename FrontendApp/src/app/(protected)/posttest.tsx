import { AssessmentStageScreen } from '@/components/experiment/assessment-stage';

export default function PosttestScreen() {
  return (
    <AssessmentStageScreen
      stage="posttest"
      step="Step 4 · After the task"
      title="A few more questions"
      blurb="Same format as before. Answer as best you can."
      next="/transfer"
    />
  );
}
