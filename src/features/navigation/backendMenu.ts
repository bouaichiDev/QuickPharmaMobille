import type { EffectiveAccess, MenuNode } from '@/types/access';
import { can, crmModules } from '@/features/crm/modules';
import type { IconName } from '@/components/ui/Icon';

export interface MobileMenuItem {
  label: string;
  icon: IconName;
  href: string;
  disabled?: boolean;
  reason?: string;
}
export interface MobileMenuGroup {
  title: string;
  items: MobileMenuItem[];
}

export function backendMenuGroups(access?: EffectiveAccess, menus = access?.menus ?? []) {
  const groups: MobileMenuGroup[] = [];
  function destination(route: string) {
    const path = (route.split(/[?#]/)[0] ?? '').replace(/\/$/, '');
    const key = path === '/services-crm' ? 'dashboard' : path.replace('/services-crm/', '');
    const module = crmModules.find((m) => m.key === (key === 'settings' ? 'form-builder' : key));
    if (path.startsWith('/services-crm') && module)
      return {
        href: `/crm/${module.key}`,
        icon: module.icon,
        fallback: module.label,
        denied: !can(access, module.view),
      };
    if (path === '/dashboard')
      return {
        href: '/home',
        icon: 'dashboard' as IconName,
        fallback: 'Tableau de bord',
        denied: !can(access, 'dashboard.view'),
      };
    if (path === '/superadmin/dashboard')
      return {
        href: '/home',
        icon: 'admin-panel-settings' as IconName,
        fallback: 'Tableau de plateforme',
        denied: !can(access, 'platform.metrics.view'),
      };
    const pharmacy: Record<string, [string, IconName, string]> = {
      '/products': ['/stock', 'inventory-2', 'products.view'],
      '/stock': ['/stock', 'inventory-2', 'products.view'],
      '/product': ['/stock', 'inventory-2', 'products.view'],
      '/plans': ['/plans', 'workspace-premium', 'subscription.view'],
      '/plans/selection': ['/plans', 'workspace-premium', 'subscription.view'],
      '/categories': ['/categories', 'category', 'catalog.references.view'],
      '/category': ['/categories', 'category', 'catalog.references.view'],
    };
    const target = pharmacy[path];
    return target
      ? {
          href: target[0],
          icon: target[1],
          fallback:
            target[0] === '/stock'
              ? 'Stock'
              : target[0] === '/plans'
                ? 'Abonnements'
                : 'Catégories',
          denied: !can(access, target[2]),
        }
      : undefined;
  }
  const labels: Record<string, string> = {
    Dashboard: 'Tableau de bord',
    SelectPlans: 'Abonnements',
    Stores: 'Établissements',
    Inventory: 'Inventaire',
    'Stock Entry': 'Entrées de stock',
    Sales: 'Ventes',
    Customers1: 'Clients',
    Customers: 'Clients',
    Suppliers: 'Fournisseurs',
    Purchases: 'Achats',
    Expenses: 'Dépenses',
    Reports: 'Rapports',
    Users: 'Utilisateurs',
    Settings: 'Paramètres',
    Roles: 'Rôles',
    Invoices: 'Factures',
  };
  function visit(nodes: MenuNode[], title: string) {
    for (const node of [...nodes].sort((a, b) => a.order - b.order)) {
      if (Number(node.hidden) === 1) continue;
      const heading = node.children?.length ? node.label : title;
      const target = node.route ? destination(node.route) : undefined;
      if ((node.route && !['#', '/'].includes(node.route)) || target || !node.children?.length) {
        let group = groups.find((g) => g.title === heading);
        if (!group) {
          group = { title: heading, items: [] };
          groups.push(group);
        }
        if (
          !group.items.some(
            (item) => item.href === (target?.href ?? node.route ?? `pending-menu-${node.id}`),
          )
        )
          group.items.push({
            label:
              labels[node.label] ??
              (node.label.startsWith('menu.') ||
              /^[a-z_]+$/.test(node.label) ||
              ['Products', 'Categories'].includes(node.label)
                ? (target?.fallback ?? node.label.replace(/^menu[.]/, '').replace(/[_-]/g, ' '))
                : node.label),
            href: target?.href ?? node.route ?? `pending-menu-${node.id}`,
            icon: target?.icon ?? 'apps',
            ...(!target
              ? { disabled: true, reason: 'À développer sur mobile' }
              : 'denied' in target && target.denied
                ? { disabled: true, reason: 'Accès non autorisé' }
                : {}),
          });
      }
      visit(node.children ?? [], heading);
    }
  }
  visit(menus, 'Modules');
  return groups;
}
