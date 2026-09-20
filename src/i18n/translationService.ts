import { config } from '@/constants/config';
import { preferenceKeys } from '@/constants/storageKeys';
import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { preferences } from '@/services/storage/preferences';
import type { LanguageCode } from '@/types/api';
import { logger } from '@/utils/logger';

import type { TranslationTree } from './translate';

interface CachedTranslations {
  savedAt: string;
  tree: TranslationTree;
}

function asTree(value: unknown): TranslationTree {
  if (typeof value === 'string') {
    // axios hands back raw text when its JSON parsing fails silently.
    try {
      return asTree(JSON.parse(value));
    } catch (error) {
      logger.warn('Translations payload is not valid JSON for this runtime', {
        length: value.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as TranslationTree)
    : {};
}

/**
 * Same merge as the web app: version 2 holds the application texts, version 1
 * only contributes the `access` subtree (permission / plan / quota labels).
 */
export function mergeTranslationVersions(
  appTree: TranslationTree,
  accessTree: TranslationTree,
): TranslationTree {
  const merged: TranslationTree = { ...appTree };
  if (accessTree.access && !merged.access) {
    merged.access = accessTree.access;
  } else if (accessTree.access && merged.access) {
    merged.access = { ...asTree(accessTree.access), ...asTree(merged.access) };
  }
  return merged;
}

export async function fetchRemoteTranslations(language: LanguageCode): Promise<TranslationTree> {
  const requestOptions = { skipAuth: true, skipStoreContext: true } as const;
  const [appTree, accessTree] = await Promise.all([
    apiGet<unknown>(endpoints.translations(language, config.translationVersion), requestOptions),
    config.accessTranslationVersion === config.translationVersion
      ? Promise.resolve({})
      : apiGet<unknown>(
          endpoints.translations(language, config.accessTranslationVersion),
          requestOptions,
        ).catch(() => ({})),
  ]);
  return mergeTranslationVersions(asTree(appTree), asTree(accessTree));
}

export async function readCachedTranslations(
  language: LanguageCode,
): Promise<TranslationTree | null> {
  const cached = await preferences.getJson<CachedTranslations>(
    preferenceKeys.translationsCache + language,
  );
  return cached ? asTree(cached.tree) : null;
}

export async function writeCachedTranslations(
  language: LanguageCode,
  tree: TranslationTree,
): Promise<void> {
  const payload: CachedTranslations = { savedAt: new Date().toISOString(), tree };
  await preferences.setJson(preferenceKeys.translationsCache + language, payload);
}

/** Cache first (instant), then network; the network result replaces the cache. */
export async function refreshTranslations(language: LanguageCode): Promise<TranslationTree | null> {
  try {
    const tree = await fetchRemoteTranslations(language);
    await writeCachedTranslations(language, tree);
    return tree;
  } catch (error) {
    logger.warn(`Translations for ${language} unavailable, using cache/local fallback.`, error);
    return null;
  }
}
