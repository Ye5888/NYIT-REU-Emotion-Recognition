import { useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';
import { useSession } from '@/experiment/session';

export default function WelcomeScreen() {
  const router = useRouter();
  const { session } = useSession();

  return (
    <PlaceholderScreen
      step="Welcome"
      title="Epistemic Emotion Study"
      blurb="Thanks for taking part. This session records how you work through a short learning task, to help us study epistemic emotions like confusion and engagement."
      todos={[
        'Study intro / what to expect',
        'Link to the full information sheet (IRB)',
        `Debug — session id: ${session.sessionId}`,
      ]}
      continueLabel="Begin"
      onContinue={() => router.push('/login')}
    />
  );
}
