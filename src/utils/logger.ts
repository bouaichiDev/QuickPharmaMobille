const SENSITIVE_KEYS = /token|password|authorization|store_id|user_id|secret|email|c_password/i;
const MAX_DEPTH = 4;

/** Replaces sensitive values so tokens, passwords and ids never reach the logs. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || value === undefined) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : redact(entry, depth + 1);
    }
    return result;
  }
  if (typeof value === 'string' && /^Bearer\s/i.test(value)) {
    return '[redacted]';
  }
  return value;
}

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const logger = {
  debug(message: string, data?: unknown) {
    // eslint-disable-next-line no-console -- dev-only, values are redacted
    if (isDev) console.log(`[qp] ${message}`, data === undefined ? '' : redact(data));
  },
  warn(message: string, data?: unknown) {
    if (isDev) console.warn(`[qp] ${message}`, data === undefined ? '' : redact(data));
  },
  error(message: string, data?: unknown) {
    console.error(`[qp] ${message}`, data === undefined ? '' : redact(data));
  },
};
