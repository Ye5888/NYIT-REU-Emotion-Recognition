import { useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';

export default function PosttestScreen() {
  const router = useRouter();

  return (
    <PlaceholderScreen
      step="Step 3 · Posttest"
      title="After the task"
      blurb="Comprehension and transfer questions. Compared against your pretest, these measure what you learned — transfer items are where confusion tends to pay off."
      todos={[
        'Post-test + transfer items (D’Mello)',
        'Scored → session.posttest',
        'Learning outcome = the external criterion for which probes count as labels',
      ]}
      continueLabel="Continue"
      onContinue={() => router.push('/done')}
    />
  );
}
