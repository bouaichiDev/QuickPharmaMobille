import {
  AxiosHeaders,
  create,
  isAxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { logger } from '@/utils/logger';

import { ApiError, normalizeApiError } from './apiError';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Public endpoint: no bearer token, no 401 session handling. */
    skipAuth?: boolean;
    /** Do not inject store_id (login, translations, global resources). */
    skipStoreContext?: boolean;
  }
}

export interface HttpClientContext {
  getToken: () => string | null;
  /** Encrypted store id exactly as returned by the API. */
  getStoreId: () => string | null;
  getLanguage: () => string;
  /** Token rejected by the server: the session must be cleared. */
  onUnauthorized: () => void;
  /** 403/409 refusal carrying an access `code`: access must be refreshed. */
  onAccessDenied: (error: ApiError) => void;
}

export interface HttpClientOptions {
  baseURL: string;
  timeoutMs: number;
  context: HttpClientContext;
}

const BODY_METHODS = new Set(['post', 'put', 'patch']);

/**
 * The backend reads `store_id` and `lang` from the query string for GET/DELETE
 * and from the body otherwise (never from headers). Explicit values win.
 */
export function injectRequestContext(
  config: InternalAxiosRequestConfig,
  storeId: string | null,
  language: string,
): InternalAxiosRequestConfig {
  const method = (config.method ?? 'get').toLowerCase();
  const additions: Record<string, string> = { lang: language };
  if (storeId && !config.skipStoreContext) additions.store_id = storeId;

  if (BODY_METHODS.has(method)) {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      for (const [key, value] of Object.entries(additions)) {
        if (!config.data.has(key)) config.data.append(key, value);
      }
    } else {
      const body = (config.data ?? {}) as Record<string, unknown>;
      config.data = { ...additions, ...body };
    }
  } else {
    const params = (config.params ?? {}) as Record<string, unknown>;
    config.params = { ...additions, ...params };
  }
  return config;
}

export function createHttpClient({ baseURL, timeoutMs, context }: HttpClientOptions): AxiosInstance {
  const instance = create({
    baseURL,
    timeout: timeoutMs,
    // The XHR adapter lost characters on large bodies on Android (invalid JSON
    // returned as raw text); fetch reads the body in one piece.
    adapter: ['fetch', 'xhr'],
    headers: {
      // Mandatory: without it Laravel redirects 401/422 to a web route (500).
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use((config) => {
    const headers = AxiosHeaders.from(config.headers);
    const language = context.getLanguage();
    headers.set('Accept-Language', language);

    if (!config.skipAuth) {
      const token = context.getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;

    return injectRequestContext(config, context.getStoreId(), language);
  });

  instance.interceptors.response.use(
    (response) => {
      if (typeof response.data === 'string' && response.data.length > 0) {
        // axios returns the raw text when JSON parsing fails silently.
        logger.warn('Non-JSON API response', {
          url: response.config.url,
          length: response.data.length,
          head: response.data.slice(0, 80),
          tail: response.data.slice(-80),
        });
      }
      return response;
    },
    (rawError: unknown) => {
      const error = normalizeApiError(rawError);
      const requestConfig = isAxiosError(rawError) ? rawError.config : undefined;

      if (error.kind === 'unauthorized' && !requestConfig?.skipAuth && context.getToken()) {
        logger.warn('Session rejected by the API (401).', {
          url: requestConfig?.url,
          message: error.message,
        });
        context.onUnauthorized();
      } else if (error.accessCode) {
        context.onAccessDenied(error);
      }

      return Promise.reject(error);
    },
  );

  return instance;
}
