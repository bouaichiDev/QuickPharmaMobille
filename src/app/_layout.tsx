import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { getConfigErrors } from '@/constants/config';
import { useTranslation } from '@/i18n/useTranslation';
import { AppProviders } from '@/providers/AppProviders';
import { OnboardingContext } from '@/providers/onboardingContext';
import { useAppBootstrap } from '@/providers/useAppBootstrap';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

function ConfigError({ errors }: { errors: string[] }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="settings"
      tone="error"
      title={t('mobile.common.errorConfig')}
      message={errors.join('\n')}
    />
  );
}

export default function RootLayout() {
  const { ready, onboardingDone } = useAppBootstrap();
  const configErrors = getConfigErrors();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // The native splash (logo) stays visible until fonts, language and session are restored.
  if (!ready) return null;

  return (
    <AppProviders>
      <StatusBar style="dark" />
      {configErrors.length > 0 ? (
        <ConfigError errors={configErrors} />
      ) : (
        <OnboardingContext.Provider value={onboardingDone}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </OnboardingContext.Provider>
      )}
    </AppProviders>
  );
}
