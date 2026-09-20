import { isApiError } from '@/services/api/apiError';
import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { StatusEnvelope } from '@/types/api';

import type { SessionStore } from '../auth/types';

interface UserStoreRow {
  storeName: string;
  /** Encrypted when `userid` is sent encrypted. */
  storeId: string;
}

export const storesApi = {
  /**
   * GET /users/getUserStores — requires team.users.view or team.stores.assign.
   * The encrypted user id makes the backend return encrypted store ids, which
   * are the only ones accepted as `store_id`. A 404 means "no store".
   */
  async listForUser(encryptedUserId: string): Promise<SessionStore[]> {
    try {
      const body = await apiGet<StatusEnvelope<UserStoreRow[] | null>>(endpoints.users.storesOf, {
        params: { userid: encryptedUserId },
      });
      return (body.data ?? []).map((row) => ({ id: row.storeId, name: row.storeName }));
    } catch (error) {
      if (isApiError(error) && error.kind === 'not_found') return [];
      throw error;
    }
  },
};
