/**
 * Far transfer — the same reasoning applied to material the participant has
 * never seen. In D'Mello et al. (2014) this is where induced confusion pays off
 * most, so it is a separate stage rather than more posttest items.
 *
 * The copy deliberately does not say "apply what you just learned": cueing the
 * transfer is itself an intervention, and it would inflate exactly the measure
 * the study is trying to observe.
 */
import { AssessmentStageScreen } from '@/components/experiment/assessment-stage';

export default function TransferScreen() {
  return (
    <AssessmentStageScreen
      stage="transfer"
      step="Step 5 · Last set"
      title="A few new scenarios"
      blurb="These describe situations you haven't seen yet. Answer as best you can."
      next="/done"
      finalLabel="Finish"
    />
  );
}
