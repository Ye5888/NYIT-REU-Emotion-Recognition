import { useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';

export default function PretestScreen() {
  const router = useRouter();

  return (
    <PlaceholderScreen
      step="Step 1 · Pretest"
      title="Before we start"
      blurb="A few questions to gauge what you already understand about the topic. This baseline is what lets us measure what you actually learn during the task."
      todos={[
        'Prior-knowledge items (pull exact items from the D’Mello pretest)',
        'Scored → session.pretest',
        'Baseline for the learning gain (posttest − pretest)',
      ]}
      continueLabel="Start the task"
      onContinue={() => router.push('/task')}
    />
  );
}
