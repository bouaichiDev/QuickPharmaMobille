import type { TranslationDictionary } from './locales/fr';

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;

type Paths<T> = {
  [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T];

/** Every key of the local dictionary, e.g. 'mobile.auth.loginTitle'. */
export type TranslationKey = Paths<TranslationDictionary>;

export type TranslationParams = Record<string, string | number>;

export type TranslationTree = Record<string, unknown>;

export function getByPath(tree: unknown, path: string): string | undefined {
  let node: unknown = tree;
  for (const segment of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' && node.length > 0 ? node : undefined;
}

/** Supports the backend syntax [name] and the Laravel-style :name / {name}. */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\[(\w+)\]|\{(\w+)\}|:(\w+)/g, (match, a, b, c) => {
    const name = (a ?? b ?? c) as string;
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export interface TranslatorSources {
  /** Dictionary loaded from GET /translations (may be null offline). */
  remote: TranslationTree | null;
  /** Local fallback for the active language. */
  local: TranslationTree;
  /** Local reference language (French). */
  reference: TranslationTree;
}

/**
 * Resolution order: backend value -> local value of the active language ->
 * local French -> the key itself (visible, so a missing key is noticed).
 */
export function createTranslator(sources: TranslatorSources) {
  function lookup(key: string): string | undefined {
    return (
      getByPath(sources.remote, key) ??
      getByPath(sources.local, key) ??
      getByPath(sources.reference, key)
    );
  }

  function t(key: TranslationKey, params?: TranslationParams): string {
    return interpolate(lookup(key) ?? key, params);
  }

  /** For keys coming from the API (e.g. access.errors.QUOTA_EXCEEDED). */
  function tDynamic(key: string | null | undefined, fallback: string, params?: TranslationParams) {
    const value = key ? lookup(key) : undefined;
    return interpolate(value ?? fallback, params);
  }

  return { t, tDynamic };
}

export type Translator = ReturnType<typeof createTranslator>;
