import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import { normalizeApiError } from '@/services/api/apiError';

function axiosError(status: number, data: unknown, headers: Record<string, string> = {}): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = { status, data, headers, config, statusText: '' } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, response);
}

describe('normalizeApiError', () => {
  it('maps a 401 to unauthorized', () => {
    const error = normalizeApiError(axiosError(401, { message: 'Unauthenticated.' }));
    expect(error.kind).toBe('unauthorized');
    expect(error.accessCode).toBeNull();
  });

  it('maps a 403 access refusal with its code, reason and message key', () => {
    const error = normalizeApiError(
      axiosError(403, {
        success: false,
        status: false,
        code: 'FEATURE_NOT_INCLUDED',
        reason: 'FEATURE_NOT_IN_PLAN',
        message: "Cette fonctionnalité n'est pas incluse dans votre abonnement.",
        message_key: 'access.errors.FEATURE_NOT_INCLUDED',
        details: { permission: 'invoices.create_manual', feature: 'invoicing.manual' },
      }),
    );
    expect(error.kind).toBe('access_denied');
    expect(error.accessCode).toBe('FEATURE_NOT_INCLUDED');
    expect(error.accessReason).toBe('FEATURE_NOT_IN_PLAN');
    expect(error.messageKey).toBe('access.errors.FEATURE_NOT_INCLUDED');
    expect(error.details.feature).toBe('invoicing.manual');
  });

  it('maps a 409 quota refusal with its usage details', () => {
    const error = normalizeApiError(
      axiosError(409, { code: 'QUOTA_EXCEEDED', reason: 'LIMIT_REACHED', message: 'Limite', details: { limit: 100, used: 100 } }),
    );
    expect(error.kind).toBe('access_denied');
    expect(error.accessCode).toBe('QUOTA_EXCEEDED');
    expect(error.details).toEqual({ limit: 100, used: 100 });
  });

  it('keeps a plain 403 (no access code) as forbidden and detects a suspended store', () => {
    const error = normalizeApiError(axiosError(403, { success: false, message: 'This store is suspended. Contact the platform administrator.' }));
    expect(error.kind).toBe('forbidden');
    expect(error.isStoreSuspended).toBe(true);
  });

  it('reads Laravel 422 field errors', () => {
    const error = normalizeApiError(axiosError(422, { message: 'Invalid', errors: { email: ['The email field is required.'] } }));
    expect(error.kind).toBe('validation');
    expect(error.fieldErrors.email).toEqual(['The email field is required.']);
  });

  it('treats sendError validation (400/404 + data) as validation', () => {
    const error = normalizeApiError(
      axiosError(400, { success: false, message: 'Validation Error.', data: { email: ['The email has already been taken.'] } }),
    );
    expect(error.kind).toBe('validation');
    expect(error.fieldErrors.email?.[0]).toBe('The email has already been taken.');
  });

  it('keeps a real 404 as not_found', () => {
    expect(normalizeApiError(axiosError(404, { success: false, message: 'Plan not found' })).kind).toBe('not_found');
  });

  it('reads Retry-After on a 429 lockout', () => {
    const error = normalizeApiError(axiosError(429, { success: false, message: 'Too many' }, { 'retry-after': '120' }));
    expect(error.kind).toBe('rate_limited');
    expect(error.retryAfterSeconds).toBe(120);
  });

  it('distinguishes network failures and timeouts', () => {
    const config = { headers: new AxiosHeaders() };
    expect(normalizeApiError(new AxiosError('Network Error', 'ERR_NETWORK', config)).kind).toBe('network');
    expect(normalizeApiError(new AxiosError('timeout', 'ECONNABORTED', config)).kind).toBe('timeout');
  });

  it('wraps unknown errors', () => {
    expect(normalizeApiError(new Error('boom')).kind).toBe('unknown');
  });
});
