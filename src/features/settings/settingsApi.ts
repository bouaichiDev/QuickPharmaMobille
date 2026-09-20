import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';

interface GeneralSettingRow {
  name: string;
  value: string | null;
}

export const settingsApi = {
  /** GET /GetSettings — raw list of { name, value } (no envelope). */
  async getGeneral(): Promise<Record<string, string>> {
    const rows = await apiGet<GeneralSettingRow[]>(endpoints.settings.global, {
      skipAuth: true,
      // The backend currently ignores the store for this list.
      skipStoreContext: true,
    });
    const settings: Record<string, string> = {};
    for (const row of Array.isArray(rows) ? rows : []) {
      if (row?.name && row.value !== null && row.value !== undefined) {
        settings[row.name] = String(row.value);
      }
    }
    return settings;
  },
};

/** Currency configured on the backend, or null when none is defined. */
export function useCurrency(): string | null {
  const { data } = useQuery({
    queryKey: ['settings', 'general'],
    queryFn: settingsApi.getGeneral,
    staleTime: 60 * 60_000,
  });
  return data?.Currency ?? null;
}
