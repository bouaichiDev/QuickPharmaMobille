import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';

import { dashboardApi } from './dashboardApi';
import type { DashboardPeriod } from './types';

function useStoreKey() {
  return useSessionStore((state) => state.session?.activeStore?.id ?? null);
}

export function usePharmacyDashboard(period: DashboardPeriod, enabled = true) {
  const storeId = useStoreKey();
  return useQuery({
    queryKey: ['dashboard', 'pharmacy', storeId, period.year, period.month],
    queryFn: () => dashboardApi.pharmacy(period),
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useCrmDashboard(enabled = true) {
  const storeId = useStoreKey();
  return useQuery({
    queryKey: ['dashboard', 'crm', storeId],
    queryFn: dashboardApi.crm,
    enabled,
    staleTime: 2 * 60_000,
  });
}

export function useAlertsDashboard(enabled = true) {
  const storeId = useStoreKey();
  return useQuery({
    queryKey: ['alerts', 'dashboard', storeId],
    queryFn: dashboardApi.alerts,
    enabled,
    staleTime: 60_000,
  });
}

/** Period options offered by the dashboard (the API filters by year and month). */
export function buildPeriods(now: Date = new Date()): Record<'month' | 'previousMonth' | 'year', DashboardPeriod> {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return {
    month: { year, month },
    previousMonth: previous,
    year: { year, month: 0 },
  };
}
