import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '@/features/auth/sessionStore';

export default function AuthLayout() {
  const status = useSessionStore((state) => state.status);
  if (status === 'booting') return null;
  if (status === 'authenticated') return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
