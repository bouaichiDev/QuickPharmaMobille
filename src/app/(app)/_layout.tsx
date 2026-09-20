import { Redirect, Stack } from 'expo-router';

import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { useSessionStore } from '@/features/auth/sessionStore';
import { StoreAccessGuard } from '@/features/stores/components/StoreAccessGuard';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, fontFamilies } from '@/theme';

export default function AppLayout() {
  const status = useSessionStore((state) => state.status);
  const { t } = useTranslation();

  // Never redirect while the session is still being restored.
  if (status === 'booting') return null;
  if (status !== 'authenticated') return <Redirect href="/login" />;

  return (
    <StoreAccessGuard>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: fontFamilies.headingSemiBold, color: colors.onSurface },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plans/index" options={{ title: t('mobile.plans.title') }} />
        <Stack.Screen name="plans/[id]" options={{ title: t('mobile.plans.title') }} />
      </Stack>
    </StoreAccessGuard>
  );
}
