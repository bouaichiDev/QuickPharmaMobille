import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { SuccessEnvelope } from '@/types/api';

import type { AlertsDashboard, CrmDashboard, DashboardPeriod, PharmacyDashboardResponse } from './types';

export const dashboardApi = {
  async pharmacy(period: DashboardPeriod): Promise<PharmacyDashboardResponse> {
    return apiGet<PharmacyDashboardResponse>(endpoints.dashboard.pharmacy, {
      params: { year: period.year, month: period.month },
    });
  },

  async crm(): Promise<CrmDashboard> {
    const body = await apiGet<SuccessEnvelope<CrmDashboard>>(endpoints.dashboard.crm);
    return body.data;
  },

  async alerts(): Promise<AlertsDashboard> {
    const body = await apiGet<SuccessEnvelope<AlertsDashboard>>(endpoints.dashboard.alerts);
    return body.data;
  },
};
