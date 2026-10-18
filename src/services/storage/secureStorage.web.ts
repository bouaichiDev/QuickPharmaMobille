import { logger } from '@/utils/logger';

/** Browser preview only. Native keeps expo-secure-store and the OS keychain.
 * Session storage expires with the browser session; passwords are never stored.
 */
const fallback = new Map<string, string>();
const prefix = 'quickpharma.session.';
export const secureStorage = {
  async getJson<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;
    try {
      const value = window.sessionStorage.getItem(prefix + key) ?? fallback.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      const value = fallback.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }
  },
  async setJson(key: string, value: unknown): Promise<void> {
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(value);
    fallback.set(key, serialized);
    try {
      window.sessionStorage.setItem(prefix + key, serialized);
    } catch {
      logger.warn('Browser session is kept in memory only.');
    }
  },
  async remove(key: string): Promise<void> {
    fallback.delete(key);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(prefix + key);
      } catch {
        /* Memory session already cleared. */
      }
    }
  },
};
