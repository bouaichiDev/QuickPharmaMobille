import type { IconName } from '@/components/ui/Icon';
import type { EffectiveAccess } from '@/types/access';

export interface CrmModule {
  key: string;
  label: string;
  icon: IconName;
  endpoint: string;
  view: string;
  create?: string;
  update?: string;
  remove?: string;
  quota?: string;
}

export const crmModules: CrmModule[] = [
  {
    key: 'form-builder',
    label: 'Champs des services',
    icon: 'dynamic-form',
    endpoint: '/services',
    view: 'services.fields.manage',
    create: 'services.fields.manage',
    update: 'services.fields.manage',
    remove: 'services.fields.manage',
  },
  {
    key: 'care-catalogs',
    label: 'Catalogues de soins',
    icon: 'healing',
    endpoint: '/crm-care/references',
    view: 'services.catalog.manage',
    create: 'services.catalog.manage',
    update: 'services.catalog.manage',
    remove: 'services.catalog.manage',
  },
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    icon: 'dashboard',
    endpoint: '/crm-reports/dashboard',
    view: 'services.sessions.view',
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: 'group',
    endpoint: '/customerliste',
    view: 'services.clients.view',
    create: 'customers.create',
    update: 'customers.update',
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'medical-services',
    endpoint: '/services',
    view: 'services.catalog.view',
    create: 'services.catalog.manage',
    update: 'services.catalog.manage',
    remove: 'services.catalog.manage',
    quota: 'services.active_types',
  },
  {
    key: 'service-packages',
    label: 'Catalogue des forfaits',
    icon: 'inventory',
    endpoint: '/service-packages',
    view: 'services.packages.view',
    create: 'services.catalog.manage',
    update: 'services.catalog.manage',
    remove: 'services.catalog.manage',
  },
  {
    key: 'packages',
    label: 'Forfaits clients',
    icon: 'card-membership',
    endpoint: '/customer-service-packages',
    view: 'services.packages.view',
    create: 'services.packages.sell',
    update: 'services.packages.sell',
    remove: 'services.packages.sell',
  },
  {
    key: 'sessions',
    label: 'Séances',
    icon: 'event-note',
    endpoint: '/service-sessions',
    view: 'services.sessions.view',
    create: 'services.sessions.create',
    update: 'services.sessions.update',
    remove: 'services.sessions.cancel',
    quota: 'services.sessions.monthly',
  },
  {
    key: 'appointments',
    label: 'Rendez-vous',
    icon: 'event-available',
    endpoint: '/service-appointments',
    view: 'services.appointments.view',
    create: 'services.appointments.manage',
    update: 'services.appointments.manage',
    remove: 'services.appointments.manage',
  },
  {
    key: 'payments',
    label: 'Paiements',
    icon: 'payments',
    endpoint: '/payments',
    view: 'services.payments.view',
  },
  {
    key: 'reports',
    label: 'Rapports',
    icon: 'bar-chart',
    endpoint: '/crm-reports/analytics',
    view: 'services.reports.view',
  },
  {
    key: 'timeline',
    label: 'Historique',
    icon: 'history',
    endpoint: '/crm-timeline',
    view: 'services.audit.view',
  },
];

export function can(access: EffectiveAccess | undefined, permission?: string) {
  return !!permission && !!access?.permissions.includes(permission);
}

export function canCreate(access: EffectiveAccess | undefined, module: CrmModule) {
  if (!can(access, module.create)) return false;
  if (!module.quota) return true;
  const quota = access?.quotas[module.quota];
  return (
    !!quota?.configured && (quota.unlimited || (!quota.exceeded && (quota.remaining ?? 0) > 0))
  );
}
