import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { preferenceKeys } from '@/constants/storageKeys';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useI18nStore } from '@/i18n/i18nStore';
import { preferences } from '@/services/storage/preferences';
import { logger } from '@/utils/logger';

// Registers the access-denied handler on the HTTP client at startup.
import '@/features/access/useAccess';

/** Fonts, language, onboarding flag and secure session restore — before the first screen. */
export function useAppBootstrap() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [coreReady, setCoreReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await useI18nStore.getState().hydrate();
        const [flag] = await Promise.all([
          preferences.getString(preferenceKeys.onboardingDone),
          useSessionStore.getState().bootstrap(),
        ]);
        if (!cancelled) setOnboardingDone(flag === '1');
      } catch (error) {
        logger.error('Bootstrap failed', error);
      } finally {
        if (!cancelled) setCoreReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    // A font failure must not block the app: system fonts are used instead.
    ready: coreReady && (fontsLoaded || !!fontError),
    onboardingDone,
  };
}
