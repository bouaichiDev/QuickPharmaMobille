import type { LaravelPaginator } from '@/types/api';

import type { AlertItem } from '../dashboard/types';

/** Row of GET /showNotifications (NotificationController::index). */
export interface NotificationItem {
  id: number;
  /** Already translated server-side when tr_key is set (uses `lang`). */
  title: string;
  content: string;
  tr_key: string | null;
  tr_data: string | null;
  from: string | null;
  fromPic: string | null;
  userId: number;
  icon: string | null;
  color: string | null;
  backColor: string | null;
  created_at: string;
  updated_at: string;
  isRead: number;
  /** Relative age computed by the backend: "12 m", "3 h", "2 d". */
  time: string;
}

export interface NotificationsResponse {
  notifications: LaravelPaginator<NotificationItem>;
  unreadCount: number;
}

export interface AlertsPage {
  data: AlertItem[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export type NotificationFilter = 'messages' | 'alerts';
