import { useTranslation } from './useTranslation';
import { accountMessages, type AccountMessageKey } from './accountMessages';
import type { TranslationParams } from './translate';

export function useAccountTranslation() {
  const { language, tDynamic } = useTranslation();
  return (key: AccountMessageKey, params?: TranslationParams) =>
    tDynamic(key, accountMessages[key][language], params);
}
