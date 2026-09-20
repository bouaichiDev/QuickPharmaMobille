import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { ApiError } from '@/services/api/apiError';
import {
  createHttpClient,
  injectRequestContext,
  type HttpClientContext,
} from '@/services/api/httpClient';

function config(partial: Partial<InternalAxiosRequestConfig>): InternalAxiosRequestConfig {
  return { headers: new AxiosHeaders(), ...partial } as InternalAxiosRequestConfig;
}

describe('injectRequestContext', () => {
  it('puts store_id and lang in the query string for GET', () => {
    const result = injectRequestContext(config({ method: 'get', params: { page: 2 } }), 'enc-store', 'ar');
    expect(result.params).toEqual({ store_id: 'enc-store', lang: 'ar', page: 2 });
  });

  it('puts store_id and lang in the body for POST without overriding explicit values', () => {
    const result = injectRequestContext(
      config({ method: 'post', data: { store_id: 'explicit', name: 'x' } }),
      'enc-store',
      'fr',
    );
    expect(result.data).toEqual({ store_id: 'explicit', lang: 'fr', name: 'x' });
  });

  it('skips the store when requested', () => {
    const result = injectRequestContext(config({ method: 'get', skipStoreContext: true }), 'enc-store', 'fr');
    expect(result.params).toEqual({ lang: 'fr' });
  });

  it('appends to FormData bodies', () => {
    const form = new FormData();
    form.append('name', 'x');
    const result = injectRequestContext(config({ method: 'post', data: form }), 'enc-store', 'es');
    expect((result.data as FormData).get('store_id')).toBe('enc-store');
    expect((result.data as FormData).get('lang')).toBe('es');
  });
});

describe('createHttpClient', () => {
  function setup(adapter: AxiosAdapter, token: string | null = 'tok') {
    const context: HttpClientContext = {
      getToken: () => token,
      getStoreId: () => 'enc-store',
      getLanguage: () => 'fr',
      onUnauthorized: jest.fn(),
      onAccessDenied: jest.fn(),
    };
    const client = createHttpClient({ baseURL: 'https://api.test/api', timeoutMs: 1000, context });
    client.defaults.adapter = adapter;
    return { client, context };
  }

  function reject(status: number, data: unknown): AxiosAdapter {
    return async (requestConfig) => {
      throw new AxiosError('fail', 'ERR_BAD_RESPONSE', requestConfig, {}, {
        status,
        data,
        headers: {},
        config: requestConfig,
        statusText: '',
      });
    };
  }

  it('sends JSON, bearer token and language headers', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    const { client } = setup(async (requestConfig) => {
      seen = requestConfig;
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config: requestConfig };
    });

    await client.get('/dashboard');

    const headers = AxiosHeaders.from(seen!.headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer tok');
    expect(headers.get('Accept-Language')).toBe('fr');
    expect(seen!.params).toMatchObject({ store_id: 'enc-store', lang: 'fr' });
  });

  it('does not send the token on public requests', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    const { client } = setup(async (requestConfig) => {
      seen = requestConfig;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config: requestConfig };
    });
    await client.post('/login', { email: 'a@b.c' }, { skipAuth: true, skipStoreContext: true });
    expect(AxiosHeaders.from(seen!.headers).has('Authorization')).toBe(false);
  });

  it('clears the session on 401 with a token', async () => {
    const { client, context } = setup(reject(401, { message: 'Unauthenticated.' }));
    await expect(client.get('/access/me')).rejects.toBeInstanceOf(ApiError);
    expect(context.onUnauthorized).toHaveBeenCalledTimes(1);
    expect(context.onAccessDenied).not.toHaveBeenCalled();
  });

  it('ignores 401 on public requests (wrong password)', async () => {
    const { client, context } = setup(reject(401, { message: 'Unauthorised.' }));
    await expect(client.post('/login', {}, { skipAuth: true })).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(context.onUnauthorized).not.toHaveBeenCalled();
  });

  it('notifies access refusals (403 with code) without logging out', async () => {
    const { client, context } = setup(
      reject(403, { code: 'PERMISSION_DENIED', reason: 'PERMISSION_NOT_GRANTED', message: 'Denied' }),
    );
    await expect(client.get('/dashboard')).rejects.toMatchObject({ accessCode: 'PERMISSION_DENIED' });
    expect(context.onAccessDenied).toHaveBeenCalledTimes(1);
    expect(context.onUnauthorized).not.toHaveBeenCalled();
  });

  it('notifies quota refusals (409)', async () => {
    const { client, context } = setup(reject(409, { code: 'QUOTA_EXCEEDED', message: 'Limit', details: { limit: 1, used: 1 } }));
    await expect(client.post('/stores', {})).rejects.toMatchObject({ kind: 'access_denied' });
    expect(context.onAccessDenied).toHaveBeenCalledTimes(1);
  });
});
