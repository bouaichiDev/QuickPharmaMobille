import { resolveLandingRoute } from '@/features/navigation/resolveLandingRoute';
import { type Href, Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/features/auth/sessionStore';

export default function AuthLayout() {
  const defaultRoute = useSessionStore((state) => state.session?.defaultRoute);
  const status = useSessionStore((state) => state.status);
  if (status === 'booting') return null;
  if (status === 'authenticated')
    return <Redirect href={resolveLandingRoute(defaultRoute) as Href} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
