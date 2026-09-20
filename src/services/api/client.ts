import type { AxiosRequestConfig } from 'axios';

import { config } from '@/constants/config';

import type { ApiError } from './apiError';
import { createHttpClient, type HttpClientContext } from './httpClient';

/**
 * Bridge between the HTTP client and the app state. The stores register their
 * getters at startup, which keeps the client free of imports from features.
 */
const bridge: HttpClientContext = {
  getToken: () => null,
  getStoreId: () => null,
  getLanguage: () => 'fr',
  onUnauthorized: () => undefined,
  onAccessDenied: (_error: ApiError) => undefined,
};

export function registerApiContext(partial: Partial<HttpClientContext>): void {
  Object.assign(bridge, partial);
}

export const httpClient = createHttpClient({
  baseURL: config.apiBaseUrl,
  timeoutMs: config.apiTimeoutMs,
  context: {
    getToken: () => bridge.getToken(),
    getStoreId: () => bridge.getStoreId(),
    getLanguage: () => bridge.getLanguage(),
    onUnauthorized: () => bridge.onUnauthorized(),
    onAccessDenied: (error) => bridge.onAccessDenied(error),
  },
});

export async function apiGet<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
  const response = await httpClient.get<T>(url, options);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  options?: AxiosRequestConfig,
): Promise<T> {
  const response = await httpClient.post<T>(url, body, options);
  return response.data;
}
