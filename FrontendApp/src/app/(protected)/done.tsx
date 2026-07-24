import { useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';
import { useSession } from '@/experiment/session';

export default function DoneScreen() {
  const router = useRouter();
  const { reset } = useSession();

  return (
    <PlaceholderScreen
      step="Done"
      title="Submit your data"
      blurb="Choose what to share. Anything you submit leaves your device and can't be taken back — but you can always come back later (by signing in) to submit more."
      todos={[
        'Show current vs submitted (the consent ratchet)',
        'Submit pending categories → grows session.consent.submitted',
        'Derived status: none / partial / complete',
      ]}
      continueLabel="Start over (reset session)"
      onContinue={() => {
        reset();
        router.push('/');
      }}
    />
  );
}
