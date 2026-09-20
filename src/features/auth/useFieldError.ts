import { useCallback } from 'react';

import { useTranslation } from '@/i18n/useTranslation';

import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './schemas';

/**
 * Client-side messages are translation keys; server-side messages (422) are
 * already human text from Laravel and are shown as-is.
 */
export function useFieldError() {
  const { tDynamic } = useTranslation();
  return useCallback(
    (message: string | undefined) => {
      if (!message) return undefined;
      if (!message.startsWith('mobile.')) return message;
      return tDynamic(message, message, { min: PASSWORD_MIN_LENGTH, max: NAME_MAX_LENGTH });
    },
    [tDynamic],
  );
}
