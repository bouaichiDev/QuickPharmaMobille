import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { EffectiveAccess } from '@/types/access';
import type { SuccessEnvelope } from '@/types/api';

export const accessApi = {
  /** Effective access in the active store (store_id is injected by the client). */
  async getMe(): Promise<EffectiveAccess> {
    const body = await apiGet<SuccessEnvelope<EffectiveAccess>>(endpoints.access.me);
    return body.data;
  },
};
