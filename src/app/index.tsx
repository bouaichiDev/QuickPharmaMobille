import { Redirect } from 'expo-router';

import { useSessionStore } from '@/features/auth/sessionStore';
import { useOnboardingDone } from '@/providers/onboardingContext';

/** Entry point: routes by authentication state once the session is restored. */
export default function Index() {
  const status = useSessionStore((state) => state.status);
  const onboardingDone = useOnboardingDone();

  if (status === 'booting') return null;
  if (status === 'authenticated') return <Redirect href="/home" />;
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href="/login" />;
}
