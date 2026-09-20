import type { Translator } from '@/i18n/translate';
import { normalizeApiError } from '@/services/api/apiError';

import { accessMessage } from './accessMessage';

/** User-facing message for any error thrown by an API call. */
export function errorMessage(error: unknown, translator: Translator): string {
  const apiError = normalizeApiError(error);
  const { t } = translator;

  if (apiError.accessCode) return accessMessage(apiError, translator);

  switch (apiError.kind) {
    case 'network':
      return t('mobile.common.errorNetwork');
    case 'timeout':
      return t('mobile.common.errorTimeout');
    case 'server':
      return t('mobile.common.errorServer');
    case 'rate_limited':
      return t('mobile.common.errorRateLimited');
    case 'forbidden':
      return t('mobile.common.errorForbidden');
    case 'not_found':
      return t('mobile.common.errorNotFound');
    case 'validation': {
      const first = Object.values(apiError.fieldErrors)[0]?.[0];
      return first ?? apiError.message;
    }
    default:
      return t('mobile.common.errorGeneric');
  }
}
