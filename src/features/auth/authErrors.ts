import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import type { Translator } from '@/i18n/translate';
import { normalizeApiError } from '@/services/api/apiError';
import { errorMessage } from '@/utils/errorMessage';

/** Message for a failed POST /login (401 credentials, 403 suspended, 429 lockout). */
export function loginErrorMessage(error: unknown, translator: Translator): string {
  const apiError = normalizeApiError(error);
  const { t } = translator;
  if (apiError.status === 401) return t('mobile.auth.invalidCredentials');
  if (apiError.status === 403 && apiError.isStoreSuspended) return t('mobile.auth.storeSuspended');
  if (apiError.status === 429) {
    const minutes = Math.max(1, Math.ceil((apiError.retryAfterSeconds ?? 60) / 60));
    return t('mobile.auth.accountLocked', { minutes });
  }
  return errorMessage(apiError, translator);
}

/**
 * Pushes backend field errors (422, or 400/404 + data from sendError) onto the
 * form. Returns true when at least one field was mapped.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, Path<T>>,
): boolean {
  const apiError = normalizeApiError(error);
  let mapped = false;
  for (const [field, messages] of Object.entries(apiError.fieldErrors)) {
    const target = fieldMap[field];
    const message = messages[0];
    if (target && message) {
      setError(target, { type: 'server', message });
      mapped = true;
    }
  }
  return mapped;
}
