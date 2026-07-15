import { useRouter } from 'expo-router';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <PlaceholderScreen
      step="Account (optional)"
      title="Sign in or continue as guest"
      blurb="Signing in lets you leave and come back later to submit more of your data on your own time. It's optional — you can do the whole session as a guest."
      todos={[
        'Username / password fields (real auth TBD — backend, coordinate with Anthony)',
        'Return flow: reopen a staged session to submit more',
        'Sets session.accountId (thinnest, most uncertain piece — keep minimal)',
      ]}
      continueLabel="Continue as guest"
      onContinue={() => router.push('/consent')}
    />
  );
}
