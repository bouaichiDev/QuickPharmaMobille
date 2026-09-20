import type { Translator } from '@/i18n/translate';
import type { ApiError } from '@/services/api/apiError';
import type { AccessErrorCode } from '@/types/access';

const FALLBACK_KEYS = {
  PERMISSION_DENIED: 'mobile.access.permissionDenied',
  FEATURE_NOT_INCLUDED: 'mobile.access.featureNotIncluded',
  QUOTA_EXCEEDED: 'mobile.access.quotaExceeded',
  TRIAL_EXPIRED: 'mobile.access.trialExpired',
  STORE_ACCESS_DENIED: 'mobile.access.storeAccessDenied',
  ACCESS_CONFIGURATION_CONFLICT: 'mobile.access.configurationConflict',
} as const satisfies Record<AccessErrorCode, string>;

export function accessCodeMessage(
  code: AccessErrorCode,
  messageKey: string | null,
  { t, tDynamic }: Translator,
  params?: Record<string, string | number>,
): string {
  // Backend label first (access.errors.* in the langs table), local text otherwise.
  return tDynamic(messageKey ?? `access.errors.${code}`, t(FALLBACK_KEYS[code], params), params);
}

export function accessMessage(error: ApiError, translator: Translator): string {
  const code = error.accessCode;
  if (!code) return error.message;
  const params = {
    used: String(error.details.used ?? '-'),
    limit: String(error.details.limit ?? '-'),
  };
  return accessCodeMessage(code, error.messageKey, translator, params);
}
