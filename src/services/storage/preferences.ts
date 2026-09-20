import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/utils/logger';

/** Non-sensitive preferences only. Tokens and store ids go to secureStorage. */
export const preferences = {
  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      logger.warn('preferences.getString failed', error);
      return null;
    }
  },

  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      logger.warn('preferences.setString failed', error);
    }
  },

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await preferences.getString(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    await preferences.setString(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.warn('preferences.remove failed', error);
    }
  },
};
