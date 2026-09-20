import * as SecureStore from 'expo-secure-store';

import { logger } from '@/utils/logger';

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await SecureStore.getItemAsync(key, options);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      logger.warn('secureStorage.getJson failed', error);
      return null;
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    await SecureStore.setItemAsync(key, JSON.stringify(value), options);
  },

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, options);
    } catch (error) {
      logger.warn('secureStorage.remove failed', error);
    }
  },
};
