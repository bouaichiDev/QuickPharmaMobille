import Constants from 'expo-constants';

export type AppEnv = 'development' | 'staging' | 'production';

function readAppEnv(): AppEnv {
  const value = Constants.expoConfig?.extra?.appEnv;
  return value === 'staging' || value === 'production' ? value : 'development';
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const appEnv = readAppEnv();
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

export const config = {
  appEnv,
  apiBaseUrl,
  apiTimeoutMs: readNumber(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 30000),
  translationVersion: process.env.EXPO_PUBLIC_TRANSLATION_VERSION ?? '2',
  accessTranslationVersion: process.env.EXPO_PUBLIC_ACCESS_TRANSLATION_VERSION ?? '1',
  webAppUrl: (process.env.EXPO_PUBLIC_WEB_APP_URL ?? '').replace(/\/+$/, ''),
  androidPackage: process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? 'com.quickpharma.mobile',
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
} as const;

/**
 * Configuration problems that must block the app instead of failing silently.
 * Outside development the API must be served over HTTPS.
 */
export function getConfigErrors(): string[] {
  const errors: string[] = [];
  if (!config.apiBaseUrl) {
    errors.push('EXPO_PUBLIC_API_BASE_URL is not set.');
  } else if (config.appEnv !== 'development' && !config.apiBaseUrl.startsWith('https://')) {
    errors.push('EXPO_PUBLIC_API_BASE_URL must use HTTPS outside development.');
  }
  return errors;
}
