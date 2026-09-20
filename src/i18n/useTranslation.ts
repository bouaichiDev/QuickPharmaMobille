import { useMemo } from 'react';

import { useI18nStore } from './i18nStore';
import { intlLocale, isRTLLanguage, localDictionaries } from './languages';
import { createTranslator } from './translate';

export function useTranslation() {
  const language = useI18nStore((state) => state.language);
  const remote = useI18nStore((state) => state.remote);

  return useMemo(() => {
    const translator = createTranslator({
      remote,
      local: localDictionaries[language],
      reference: localDictionaries.fr,
    });
    return {
      ...translator,
      language,
      locale: intlLocale(language),
      isRTL: isRTLLanguage(language),
    };
  }, [language, remote]);
}
