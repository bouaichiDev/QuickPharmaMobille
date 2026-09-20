import { isAxiosError, type AxiosError } from 'axios';

import {
  ACCESS_ERROR_CODES,
  type AccessErrorCode,
  type AccessReason,
} from '@/types/access';

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'access_denied'
  | 'forbidden'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export type FieldErrors = Record<string, string[]>;

interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  status?: number | null;
  code?: string | null;
  reason?: string | null;
  messageKey?: string | null;
  details?: Record<string, unknown>;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number | null;
}

/** Single error type thrown by every API call of the app. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly reason: string | null;
  readonly messageKey: string | null;
  readonly details: Record<string, unknown>;
  readonly fieldErrors: FieldErrors;
  readonly retryAfterSeconds: number | null;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.code = init.code ?? null;
    this.reason = init.reason ?? null;
    this.messageKey = init.messageKey ?? null;
    this.details = init.details ?? {};
    this.fieldErrors = init.fieldErrors ?? {};
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
  }

  /** Refusal emitted by EnforceRouteAccess / tenant middleware (403 or 409). */
  get accessCode(): AccessErrorCode | null {
    return isAccessErrorCode(this.code) ? this.code : null;
  }

  get accessReason(): AccessReason | null {
    return this.accessCode ? (this.reason as AccessReason | null) : null;
  }

  get isStoreSuspended(): boolean {
    return this.reason === 'STORE_SUSPENDED' || /store is suspended/i.test(this.message);
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isAccessErrorCode(value: unknown): value is AccessErrorCode {
  return typeof value === 'string' && (ACCESS_ERROR_CODES as readonly string[]).includes(value);
}

type UnknownBody = Record<string, unknown> | undefined;

function asRecord(value: unknown): UnknownBody {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Field errors come as `errors` (Laravel 422) or as `data` (BaseController::sendError
 * and several FormRequests). Only objects whose values are string arrays qualify.
 */
export function extractFieldErrors(body: UnknownBody): FieldErrors {
  const candidate = asRecord(body?.errors) ?? asRecord(body?.data);
  if (!candidate) return {};
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(candidate)) {
    if (Array.isArray(messages) && messages.every((m) => typeof m === 'string')) {
      result[field] = messages as string[];
    } else if (typeof messages === 'string') {
      result[field] = [messages];
    }
  }
  return result;
}

function kindForStatus(status: number, body: UnknownBody, fieldErrors: FieldErrors): ApiErrorKind {
  if (isAccessErrorCode(body?.code)) return 'access_denied';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 422) return 'validation';
  // Several legacy endpoints answer validation failures with 400/404 + field errors.
  if ((status === 400 || status === 404) && Object.keys(fieldErrors).length > 0) return 'validation';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

function readRetryAfter(error: AxiosError): number | null {
  const header = error.response?.headers?.['retry-after'];
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Converts anything thrown by axios (or elsewhere) into an ApiError. */
export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ kind: 'timeout', message: 'Request timed out.' });
    }
    if (!error.response) {
      return new ApiError({ kind: 'network', message: 'Network unavailable.' });
    }

    const { status } = error.response;
    const body = asRecord(error.response.data);
    const fieldErrors = extractFieldErrors(body);
    const message =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.error === 'string' && body.error) ||
      `Request failed with status ${status}.`;

    return new ApiError({
      kind: kindForStatus(status, body, fieldErrors),
      message,
      status,
      code: typeof body?.code === 'string' ? body.code : null,
      reason: typeof body?.reason === 'string' ? body.reason : null,
      messageKey: typeof body?.message_key === 'string' ? body.message_key : null,
      details: asRecord(body?.details) ?? {},
      fieldErrors,
      retryAfterSeconds: readRetryAfter(error),
    });
  }

  const message = error instanceof Error ? error.message : 'Unexpected error.';
  return new ApiError({ kind: 'unknown', message });
}
