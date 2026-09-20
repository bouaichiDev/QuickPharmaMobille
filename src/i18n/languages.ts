import { getLocales } from 'expo-localization';

import type { LanguageCode } from '@/types/api';

import { ar } from './locales/ar';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr, type TranslationDictionary } from './locales/fr';

/** Languages accepted by GET /translations/{lang} on the backend. */
export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['fr', 'ar', 'en', 'es'];

export const DEFAULT_LANGUAGE: LanguageCode = 'fr';

export const localDictionaries: Record<LanguageCode, TranslationDictionary> = { fr, ar, en, es };

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isRTLLanguage(language: LanguageCode): boolean {
  return language === 'ar';
}

export function detectDeviceLanguage(): LanguageCode {
  try {
    const code = getLocales()[0]?.languageCode;
    return isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Locale tag used by Intl formatters. */
export function intlLocale(language: LanguageCode): string {
  switch (language) {
    case 'ar':
      return 'ar-MA';
    case 'en':
      return 'en-GB';
    case 'es':
      return 'es-ES';
    default:
      return 'fr-FR';
  }
}
