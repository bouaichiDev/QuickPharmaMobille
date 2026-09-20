import { DevSettings, I18nManager } from 'react-native';

import type { LanguageCode } from '@/types/api';
import { logger } from '@/utils/logger';

import { isRTLLanguage } from './languages';

/**
 * Aligns the native layout direction with the language. React Native only
 * applies a direction change after a reload, so this reports whether one is needed.
 */
export function applyLayoutDirection(language: LanguageCode): boolean {
  const shouldBeRTL = isRTLLanguage(language);
  I18nManager.allowRTL(shouldBeRTL);
  if (I18nManager.isRTL === shouldBeRTL) return false;
  I18nManager.forceRTL(shouldBeRTL);
  return true;
}

export async function reloadApp(): Promise<void> {
  if (__DEV__) {
    // expo-updates refuses to reload a development build.
    DevSettings.reload();
    return;
  }
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch (error) {
    logger.warn('Reload via expo-updates failed.', error);
  }
}
