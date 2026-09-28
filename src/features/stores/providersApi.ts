import { ApiError } from '@/services/api/apiError';
import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { toNumber } from '@/utils/format';
import { logger } from '@/utils/logger';

export interface ProviderOption {
  id: number;
  name: string;
}

function providerOptionFrom(value: unknown): ProviderOption | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = toNumber(raw.id);
  if (id === null || typeof raw.name !== 'string') return null;
  return { id, name: raw.name };
}

export const providersApi = {
  async dropdown(): Promise<ProviderOption[]> {
    const response = await apiGet<unknown>(endpoints.providers.dropdown);
    if (!Array.isArray(response)) {
      logger.warn('Unexpected provider dropdown payload', {
        type: typeof response,
        keys: response && typeof response === 'object' ? Object.keys(response) : [],
      });
      throw new ApiError({ kind: 'unknown', message: 'Unexpected provider dropdown payload.' });
    }

    const providers = response.map(providerOptionFrom);
    if (providers.some((provider) => provider === null)) {
      logger.warn('Invalid provider dropdown item', { count: response.length });
      throw new ApiError({ kind: 'unknown', message: 'Invalid provider dropdown item.' });
    }
    return providers as ProviderOption[];
  },
};
