import type { EffectiveAccess, MenuNode } from '@/types/access';
import { can, crmModules } from '@/features/crm/modules';
import type { IconName } from '@/components/ui/Icon';
import { platformDestination } from '@/features/superadmin/modules';

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

export function backendMenuGroups(
  access?: EffectiveAccess,
  menus = access?.menus ?? [],
  translate: (key: string, fallback: string) => string = (_key, fallback) => fallback,
) {
  const groups: MobileMenuGroup[] = [];
  function destination(route: string) {
    const path = (route.split(/[?#]/)[0] ?? '').replace(/\/$/, '');
    const platformPath =
      path === '/roles'
        ? '/superadmin/access/roles'
        : ['/types', '/icons'].includes(path)
          ? '/statuses'
          : path;
    const platform =
      access?.role.code === 'SuperAdmin' ? platformDestination(platformPath) : undefined;
    if (platform) return { ...platform, denied: !can(access, platform.permission) };
    if (path === '/superadmin/access')
      return {
        href: '/superadmin/access',
        icon: 'admin-panel-settings' as IconName,
        fallback: 'Accès et abonnements',
        denied: !access?.permissions.some((p) => p.startsWith('platform.')),
      };
    if (path === '/users' && access?.role.code === 'SuperAdmin')
      return {
        href: '/superadmin/users',
        icon: 'group' as IconName,
        fallback: 'Utilisateurs',
        denied: !can(access, 'platform.permissions.manage'),
      };
    if (path === '/translations')
      return {
        href: '/superadmin/translations',
        icon: 'translate' as IconName,
        fallback: 'Traductions',
        denied: !can(access, 'platform.translations.manage'),
      };
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
      '/sales': ['/sales', 'point-of-sale', 'sales.view'],
      '/stores': ['/stores', 'storefront', 'stores.view'],
      '/customers': ['/customers', 'group', 'customers.view'],
      '/stock-entry': ['/entries', 'move-to-inbox', 'entries.view'],
      '/stock-entry/fast': ['/entries', 'bolt', 'entries.create'],
      '/sales/add': ['/sales?action=create', 'point-of-sale', 'sales.create'],
      '/pos': ['/sales?action=create', 'point-of-sale', 'sales.create'],
      '/products': ['/stock', 'inventory-2', 'products.view'],
      '/stock': ['/stock', 'inventory-2', 'products.view'],
      '/inventory': ['/stock?panel=inventory', 'fact-check', 'stock.view'],
      '/locations': ['/stock?panel=locations', 'place', 'stock.locations.manage'],
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
          fallback: target[0].startsWith('/sales')
            ? 'Ventes'
            : target[0] === '/stock'
              ? 'Stock'
              : target[0] === '/stock?panel=inventory'
                ? 'Inventaire'
                : target[0] === '/stock?panel=locations'
                  ? 'Emplacements'
                  : target[0] === '/plans'
                    ? 'Abonnements'
                    : 'Catégories',
          denied:
            path === '/locations'
              ? !['products.view', 'stock.view', 'stock.locations.manage'].some((permission) =>
                  can(access, permission),
                )
              : !can(access, target[2]),
        }
      : undefined;
  }
  const labels: Record<string, string> = {
    'Access & subscriptions': 'Accès et abonnements',
    Health: 'Santé plateforme',
    Tenants: 'Magasins',
    Plans: 'Plan',
    'Roles & Permissions': 'Rôles',
    validateBilling: 'Validation des factures',
    'Audit Logs': 'Journaux d’audit',
    Translations: 'Traductions',
    'menu-role assignments': 'Attribution des rôles',
    Platform: 'Plateforme',
    'Icons management': 'Icônes',
    'Status Management': 'Statuts',
    Dashboard: 'Tableau de bord',
    SelectPlans: 'Sélectionner un plan',
    Stores: 'Magasins',
    Inventory: 'Inventaire',
    'Stock Entry': 'Entrée',
    Products: 'Produits',
    Categories: 'Catégories',
    Services: 'Services',
    Orders: 'Commandes',
    Configuration: 'Configuration',
    'Finance & Tracking': 'Finance & Suivi',
    'Point of Sale': 'Point de vente',
    Billing: 'Facturation',
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
  function labelFor(node: MenuNode, fallback?: string) {
    // The web uses header || label as the translation key for every role.
    const key = node.header || node.label;
    const technical = key.startsWith('menu.') || /^[a-z_]+$/.test(key);
    return translate(
      key,
      labels[key] ??
        (technical ? (fallback ?? key.replace(/^menu[.]/, '').replace(/[_-]/g, ' ')) : key),
    );
  }
  function visit(nodes: MenuNode[], title: string) {
    for (const node of [...nodes].sort((a, b) => a.order - b.order)) {
      if (Number(node.hidden) === 1) continue;
      const heading = node.children?.length ? labelFor(node) : title;
      const target = node.route ? destination(node.route) : undefined;
      if (target || !node.children?.length) {
        let group = groups.at(-1);
        if (group?.title !== heading) group = undefined;
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
            label: labelFor(node, target?.fallback),
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
  if (
    access?.store?.access !== 'support' &&
    access?.role.code !== 'SuperAdmin' &&
    ['products.view', 'stock.view', 'stock.locations.manage'].some((permission) =>
      can(access, permission),
    ) &&
    !groups.some((g) => g.items.some((i) => i.href === '/stock?panel=locations'))
  ) {
    const stockGroup = groups.find((g) => g.items.some((i) => i.href === '/stock'));
    const item: MobileMenuItem = {
      label: 'Emplacements',
      icon: 'place',
      href: '/stock?panel=locations',
    };
    if (stockGroup) stockGroup.items.push(item);
    else groups.push({ title: 'Stock', items: [item] });
  }
  return groups;
}
