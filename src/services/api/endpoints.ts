/** Laravel routes used by the mobile app (relative to EXPO_PUBLIC_API_BASE_URL). */
export const endpoints = {
  auth: {
    login: '/login',
    register: '/register',
    logout: '/logout',
    checkToken: '/auth/check-token',
    forgotPassword: '/forgot-password',
  },
  access: {
    me: '/access/me',
  },
  users: {
    showSelf: '/users/show/0',
    storesOf: '/users/getUserStores',
  },
  settings: {
    global: '/GetSettings',
  },
  dashboard: {
    pharmacy: '/dashboard',
    crm: '/crm-reports/dashboard',
    alerts: '/alerts/dashboard',
  },
  notifications: {
    list: '/showNotifications',
    read: (id: number) => `/notifications/read/${id}`,
    readAll: '/notifications/clear',
  },
  alerts: {
    list: '/alerts',
    read: (uid: string) => `/alerts/${encodeURIComponent(uid)}/read`,
    readAll: '/alerts/read-all',
  },
  plans: {
    list: '/plans',
    detail: (id: number) => `/plans/${id}`,
  },
  translations: (lang: string, version: string) =>
    `/translations/${encodeURIComponent(lang)}/${encodeURIComponent(version)}`,
} as const;
