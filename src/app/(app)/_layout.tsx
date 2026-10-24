import { useAccountTranslation } from '@/i18n/useAccountTranslation';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/navigation/PageHeader';
import { PageLayersProvider } from '@/features/navigation/PageLayers';
import { AppBottomNavigation } from '@/features/navigation/AppBottomNavigation';
import { ServicesMenuSheet } from '@/features/navigation/ServicesMenuSheet';
import { Redirect, Stack } from 'expo-router';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { useSessionStore } from '@/features/auth/sessionStore';
import { StoreAccessGuard } from '@/features/stores/components/StoreAccessGuard';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, fontFamilies } from '@/theme';
import { SupportBanner } from '@/features/superadmin/SupportBanner';
import { MobilePushBridge } from '@/features/notifications/MobilePushBridge';
export default function AppLayout() {
  const ta = useAccountTranslation();
  const [menuVisible, setMenuVisible] = useState(false);
  const status = useSessionStore((state) => state.status);
  const { t } = useTranslation();
  // Never redirect while the session is still being restored.
  if (status === 'booting') return null;
  if (status !== 'authenticated') return <Redirect href="/login" />;
  return (
    <StoreAccessGuard>
      <MobilePushBridge />
      <View style={{ flex: 1 }}>
        <OfflineBanner />
        <SupportBanner />
        <PageLayersProvider footer={<AppBottomNavigation onMore={() => setMenuVisible(true)} />}>
          <Stack
            screenOptions={{
              header: ({ options, navigation, back }) => (
                <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }}>
                  <PageHeader
                    title={String(options.title ?? '')}
                    onBack={back ? () => navigation.goBack() : undefined}
                  />
                </SafeAreaView>
              ),
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.primary,
              headerTitleStyle: {
                fontFamily: fontFamilies.headingSemiBold,
                color: colors.onSurface,
              },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="crm/[module]" options={{ headerShown: false }} />
            <Stack.Screen name="superadmin/[module]" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ title: t('mobile.nav.more') }} />
            <Stack.Screen
              name="account-deletion-requests"
              options={{ title: ta('account_security_requests_short') }}
            />
            <Stack.Screen name="plans/index" options={{ title: t('mobile.plans.title') }} />
            <Stack.Screen name="plans/[id]" options={{ title: t('mobile.plans.title') }} />
          </Stack>
        </PageLayersProvider>
        <ServicesMenuSheet visible={menuVisible} onClose={() => setMenuVisible(false)} />
      </View>
    </StoreAccessGuard>
  );
}
