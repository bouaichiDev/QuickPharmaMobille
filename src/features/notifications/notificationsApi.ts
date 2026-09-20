import { ApiError } from '@/services/api/apiError';
import { apiGet, apiPost } from '@/services/api/client';
import { logger } from '@/utils/logger';
import { endpoints } from '@/services/api/endpoints';
import type { SuccessEnvelope } from '@/types/api';

import type { AlertsPage, NotificationsResponse } from './types';

export const PAGE_SIZE = 20;

/**
 * The backend still requires `id` / `for` on these routes for web compatibility
 * but ignores their value: the recipient is always the authenticated user.
 */
const IGNORED_RECIPIENT = 'self';

function isNotificationsResponse(body: unknown): body is NotificationsResponse {
  const notifications = (body as Partial<NotificationsResponse> | null)?.notifications;
  return !!notifications && Array.isArray(notifications.data) && typeof notifications.current_page === 'number';
}

export const notificationsApi = {
  async list(page: number): Promise<NotificationsResponse> {
    const body = await apiGet<unknown>(endpoints.notifications.list, {
      params: { id: IGNORED_RECIPIENT, page, per_page: PAGE_SIZE },
    });
    if (!isNotificationsResponse(body)) {
      logger.warn('Unexpected /showNotifications payload', {
        type: typeof body,
        keys: body && typeof body === 'object' ? Object.keys(body) : [],
      });
      throw new ApiError({ kind: 'unknown', message: 'Unexpected notifications payload.' });
    }
    return body;
  },

  async markRead(id: number): Promise<void> {
    await apiPost(endpoints.notifications.read(id));
  },

  async markAllRead(): Promise<void> {
    await apiGet(endpoints.notifications.readAll, { params: { for: IGNORED_RECIPIENT } });
  },
};

export const alertsApi = {
  async list(page: number): Promise<AlertsPage> {
    const body = await apiGet<SuccessEnvelope<AlertsPage>>(endpoints.alerts.list, {
      params: { page, per_page: PAGE_SIZE, sort_by: 'created_at', sort_direction: 'desc' },
    });
    return body.data;
  },

  async markRead(uid: string): Promise<void> {
    await apiPost(endpoints.alerts.read(uid));
  },

  async markAllRead(): Promise<void> {
    await apiPost(endpoints.alerts.readAll);
  },
};
