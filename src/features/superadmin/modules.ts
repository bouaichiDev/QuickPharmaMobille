import type { IconName } from '@/components/ui/Icon';
export const platformModules = [
  {
    key: 'users',
    title: 'Utilisateurs',
    icon: 'group',
    permission: 'platform.permissions.manage',
    web: '/users',
  },
  {
    key: 'translations',
    title: 'Traductions',
    icon: 'translate',
    permission: 'platform.translations.manage',
    web: '/translations',
  },
  {
    key: 'references',
    title: 'Configuration',
    icon: 'settings',
    permission: 'platform.reference_data.manage',
    web: '/statuses',
  },
  {
    key: 'medicine-catalog',
    title: 'Catalogue central',
    icon: 'medication',
    permission: 'platform.reference_data.manage',
    web: '/superadmin/medicine-catalog',
  },
  {
    key: 'menu-builder',
    title: 'Hiérarchie des menus',
    icon: 'account-tree',
    permission: 'platform.menus.manage',
    web: '/menu-management',
  },
  {
    key: 'role-assignments',
    title: 'Attribution des menus',
    icon: 'assignment-ind',
    permission: 'platform.menus.manage',
    web: '/menu-management/assignments',
  },
  {
    key: 'tenants',
    title: 'Établissements',
    icon: 'storefront',
    permission: 'platform.tenants.manage',
    web: '/superadmin/tenants',
  },
  {
    key: 'billings',
    title: 'Validation des factures',
    icon: 'receipt-long',
    permission: 'platform.subscriptions.manage',
    web: '/subscription-billings',
  },
  {
    key: 'health',
    title: 'Santé de la plateforme',
    icon: 'monitor-heart',
    permission: 'platform.metrics.view',
    web: '/superadmin/health',
  },
  {
    key: 'plans',
    title: 'Plans et versions',
    icon: 'workspace-premium',
    permission: 'platform.plans.manage',
    web: '/plans',
  },
  {
    key: 'plan-matrix',
    title: 'Matrice des plans',
    icon: 'table-chart',
    permission: 'platform.plans.manage',
    web: '/superadmin/access/plans',
  },
  {
    key: 'catalog',
    title: 'Modules et permissions',
    icon: 'apps',
    permission: 'platform.permissions.manage',
    web: '/superadmin/access/catalog',
  },
  {
    key: 'roles',
    title: 'Rôles et permissions',
    icon: 'admin-panel-settings',
    permission: 'platform.permissions.manage',
    web: '/superadmin/access/roles',
  },
  {
    key: 'menus',
    title: 'Configuration des menus',
    icon: 'menu',
    permission: 'platform.menus.manage',
    web: '/superadmin/access/menus',
  },
  {
    key: 'quotas',
    title: 'Définitions des quotas',
    icon: 'tune',
    permission: 'platform.plans.manage',
    web: '/superadmin/access/quotas',
  },
  {
    key: 'accounts',
    title: 'Essais et exceptions',
    icon: 'verified-user',
    permission: 'platform.overrides.manage',
    web: '/superadmin/access/accounts',
  },
  {
    key: 'simulation',
    title: 'Simulation des droits',
    icon: 'policy',
    permission: 'platform.access.simulate',
    web: '/superadmin/access/simulation',
  },
  {
    key: 'audit',
    title: 'Historique administratif',
    icon: 'history',
    permission: 'platform.audit.view',
    web: '/superadmin/access/audit',
  },
] satisfies { key: string; title: string; icon: IconName; permission: string; web: string }[];
export function platformDestination(path: string) {
  const module = platformModules.find((m) => m.web === path);
  return module
    ? {
        href: `/superadmin/${module.key}`,
        icon: module.icon,
        fallback: module.title,
        permission: module.permission,
      }
    : undefined;
}
