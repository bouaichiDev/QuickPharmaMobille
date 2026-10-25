import { apiGet, apiPost } from '@/services/api/client';
import type { SuccessEnvelope } from '@/types/api';

export interface AmmpsOffer {
  visible: boolean;
  count?: number;
  available?: number;
  unlimited?: boolean;
  remaining?: number | null;
  is_upgrade?: boolean;
  offer_token?: string;
  source_updated_at?: string | null;
}

/** An idempotency identifier, not a credential or an authorization token. */
export function importRequestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

export const ammpsOnboardingApi = {
  async offer(store: string, signal?: AbortSignal) {
    const result = await apiGet<SuccessEnvelope<AmmpsOffer>>('/products/ammps-onboarding', {
      params: { store_id: store },
      signal,
      timeout: 60000,
    });
    return result.data;
  },
  async import(store: string, offerToken: string, requestKey: string) {
    const result = await apiPost<SuccessEnvelope<{ created: number }>>(
      '/products/ammps-onboarding',
      {
        store_id: store,
        offer_token: offerToken,
        request_key: requestKey,
      },
      { timeout: 180000 },
    );
    return result.data;
  },
};
