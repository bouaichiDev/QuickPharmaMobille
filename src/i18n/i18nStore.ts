import { create } from 'zustand';

import { preferenceKeys } from '@/constants/storageKeys';
import { registerApiContext } from '@/services/api/client';
import { preferences } from '@/services/storage/preferences';
import type { LanguageCode } from '@/types/api';

import { detectDeviceLanguage, isSupportedLanguage } from './languages';
import { applyLayoutDirection, reloadApp } from './rtl';
import type { TranslationTree } from './translate';
import { readCachedTranslations, refreshTranslations } from './translationService';

interface I18nState {
  language: LanguageCode;
  remote: TranslationTree | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  changeLanguage: (language: LanguageCode) => Promise<void>;
}

async function loadInto(
  language: LanguageCode,
  set: (partial: Partial<I18nState>) => void,
  get: () => I18nState,
) {
  const cached = await readCachedTranslations(language);
  if (cached && get().language === language) set({ remote: cached });

  // The network refresh never blocks the UI: cache or local texts are shown meanwhile.
  void refreshTranslations(language).then((tree) => {
    if (tree && get().language === language) set({ remote: tree });
  });
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: 'fr',
  remote: null,
  ready: false,

  async hydrate() {
    const saved = await preferences.getString(preferenceKeys.language);
    const language = isSupportedLanguage(saved) ? saved : detectDeviceLanguage();
    applyLayoutDirection(language);
    set({ language });
    await loadInto(language, set, get);
    set({ ready: true });
  },

  async changeLanguage(language) {
    if (language === get().language) return;
    await preferences.setString(preferenceKeys.language, language);
    set({ language, remote: null });
    await loadInto(language, set, get);
    if (applyLayoutDirection(language)) {
      await reloadApp();
    }
  },
}));

registerApiContext({ getLanguage: () => useI18nStore.getState().language });
