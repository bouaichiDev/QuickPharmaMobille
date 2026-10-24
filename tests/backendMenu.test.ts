import { backendMenuGroups } from '@/features/navigation/backendMenu';
import { makeAccess } from './fixtures/access';
import type { MenuNode } from '@/types/access';

const menu = (overrides: Partial<MenuNode>): MenuNode => ({
  id: 1,
  header: null,
  label: 'Séances',
  route: '/services-crm/sessions',
  icon: null,
  parent_id: null,
  order: 1,
  hidden: 0,
  public: 0,
  role: '',
  children: [],
  ...overrides,
});
it('maps finance menu aliases to business screens and preserves permission refusals', () => {
  const nodes = [
    menu({ id: 90, label: 'Alerts Dashboard', route: '/old-alert-dashboard' }),
    menu({ id: 91, label: 'Smart alerts', route: '/legacy-smart' }),
    menu({ id: 92, label: 'Cheque due dates', route: '/legacy-due' }),
    menu({ id: 93, label: 'Customer credits', route: '/legacy-credit' }),
  ];
  const groups = backendMenuGroups(
    makeAccess({ permissions: ['payments.view', 'credits.view'] }),
    nodes,
  );
  expect(
    groups.flatMap((group) => group.items).map((item) => [item.href, !!item.disabled]),
  ).toEqual([
    ['/finance/alerts-dashboard', false],
    ['/finance/alerts-smart', false],
    ['/finance/cheques-alerts', false],
    ['/finance/credits', false],
  ]);
  expect(
    backendMenuGroups(makeAccess({ permissions: [] }), [nodes[2]!])[0]?.items[0]?.disabled,
  ).toBe(true);
});
describe('Plus menu from the effective backend tree', () => {
  it('uses web labels and keeps an unsupported platform container as a heading', () => {
    const groups = backendMenuGroups(
      makeAccess({
        role: { id: 1, code: 'SuperAdmin', scope: 'global' },
        permissions: ['platform.metrics.view', 'platform.tenants.manage'],
        menus: [
          menu({
            label: 'Platform',
            route: '/platform',
            children: [
              menu({ id: 2, label: 'Health', route: '/superadmin/health' }),
              menu({ id: 3, label: 'Tenants', route: '/superadmin/tenants' }),
            ],
          }),
        ],
      }),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe('Plateforme');
    expect(groups[0]?.items.map((i) => i.label)).toEqual(['Santé plateforme', 'Magasins']);
  });
  it('does not inject a stock shortcut into the SuperAdmin production menu', () => {
    const access = makeAccess({
      role: { id: 1, code: 'SuperAdmin', scope: 'global' },
      permissions: ['products.view', 'stock.locations.manage'],
      menus: [],
    });
    expect(backendMenuGroups(access)).toEqual([]);
    expect(
      backendMenuGroups(access, [menu({ route: '/locations', label: 'Emplacements' })])[0]
        ?.items[0],
    ).toMatchObject({ href: '/stock?panel=locations', label: 'Emplacements' });
  });
  it('does not invent an entry even when the role has its permission', () => {
    expect(
      backendMenuGroups(makeAccess({ permissions: ['services.sessions.view'], menus: [] })),
    ).toEqual([]);
  });
  it('honours hidden entries and revoked permissions without inferring rights from Admin', () => {
    expect(
      backendMenuGroups(makeAccess({ permissions: [], menus: [menu({})] }))[0]?.items[0],
    ).toMatchObject({ disabled: true, reason: 'Accès non autorisé' });
    expect(
      backendMenuGroups(
        makeAccess({ permissions: ['services.sessions.view'], menus: [menu({ hidden: 1 })] }),
      ),
    ).toEqual([]);
  });
  it('preserves backend order, hierarchy and custom labels, translating technical labels', () => {
    const groups = backendMenuGroups(
      makeAccess({
        permissions: ['services.sessions.view', 'services.clients.view'],
        menus: [
          menu({
            route: '#',
            label: 'Cabinet',
            children: [
              menu({ id: 2, order: 2, label: 'sessions' }),
              menu({ id: 3, order: 1, label: 'Mes patients', route: '/services-crm/clients' }),
            ],
          }),
        ],
      }),
    );
    expect(groups).toEqual([
      {
        title: 'Cabinet',
        parent: true,
        items: [
          { label: 'Mes patients', icon: 'group', href: '/crm/clients' },
          { label: 'Séances', icon: 'event-note', href: '/crm/sessions' },
        ],
      },
    ]);
  });
});

it('uses the retained login tree rather than the separately fetched menu tree', () => {
  const access = makeAccess({
    permissions: ['services.sessions.view'],
    menus: [menu({ label: 'Ancien menu' })],
  });
  expect(backendMenuGroups(access, [menu({ label: 'Mon cabinet' })])[0]?.items[0]?.label).toBe(
    'Mon cabinet',
  );
  expect(backendMenuGroups(access, [])).toEqual([]);
});

it('retains unauthorized role menus as disabled entries in backend order', () => {
  const groups = backendMenuGroups(
    makeAccess({
      menus: [
        menu({ route: '/suppliers', label: 'Fournisseurs', order: 2 }),
        menu({ route: '/sales', label: 'Ventes', order: 1 }),
      ],
    }),
  );
  expect(groups[0]?.items.map((item) => [item.label, item.disabled, item.reason])).toEqual([
    ['Ventes', true, 'Accès non autorisé'],
    ['Fournisseurs', true, 'Accès non autorisé'],
  ]);
});

it('also shows a visible leaf with no route as awaiting mobile implementation', () => {
  expect(
    backendMenuGroups(makeAccess({ menus: [menu({ route: null, label: 'Nouveau module' })] }))[0]
      ?.items[0],
  ).toMatchObject({ label: 'Nouveau module', disabled: true });
});

it('enables sales only when the login menu and permission both allow it', () => {
  expect(
    backendMenuGroups(
      makeAccess({
        permissions: ['sales.view'],
        menus: [menu({ route: '/sales', label: 'Sales' })],
      }),
    )[0]?.items[0],
  ).toMatchObject({ href: '/sales', label: 'Ventes' });
  expect(
    backendMenuGroups(
      makeAccess({
        permissions: ['sales.create'],
        menus: [menu({ route: '/sales/add', label: 'Sales' })],
      }),
    )[0]?.items[0],
  ).toMatchObject({ href: '/sales?action=create' });
});

it('adds the requested locations shortcut only with the backend permission and avoids duplicates', () => {
  const permission = { permissions: ['stock.locations.manage'] };
  expect(
    backendMenuGroups(makeAccess(permission))
      .flatMap((g) => g.items)
      .filter((i) => i.href === '/stock?panel=locations'),
  ).toHaveLength(1);
  expect(
    backendMenuGroups(makeAccess({ permissions: [] }))
      .flatMap((g) => g.items)
      .filter((i) => i.href === '/stock?panel=locations'),
  ).toHaveLength(0);
  expect(
    backendMenuGroups(
      makeAccess({ ...permission, menus: [menu({ route: '/locations', label: 'Emplacements' })] }),
    )
      .flatMap((g) => g.items)
      .filter((i) => i.href === '/stock?panel=locations'),
  ).toHaveLength(1);
});

it('exposes locations to a stock reader without granting management rights', () => {
  for (const permission of ['products.view', 'stock.view']) {
    const items = backendMenuGroups(makeAccess({ permissions: [permission], menus: [] })).flatMap(
      (g) => g.items,
    );
    expect(items.find((i) => i.href === '/stock?panel=locations')).toMatchObject({
      label: 'Emplacements',
    });
    expect(items.find((i) => i.href === '/stock?panel=locations')?.disabled).not.toBe(true);
  }
});

it.each(['Admin', 'serviceCRM', 'vendeur', 'custom-role', 'SuperAdmin'])(
  'keeps web labels and order for %s without renaming modules for mobile',
  (code) => {
    const access = makeAccess({
      role: { id: 1, code, scope: 'global' },
      permissions: [],
      menus: [
        menu({ id: 1, label: 'Products', route: '/products', order: 1 }),
        menu({ id: 2, label: 'SelectPlans', route: '/plans/selection', order: 2 }),
        menu({ id: 3, label: 'Stores', route: '/stores', order: 3 }),
        menu({ id: 4, label: 'Categories', route: '/categories', order: 4 }),
        menu({ id: 5, label: 'Stock Entry', route: '/stock-entry', order: 5 }),
      ],
    });
    expect(
      backendMenuGroups(access)
        .flatMap((g) => g.items)
        .map((i) => i.label),
    ).toEqual(['Produits', 'Sélectionner un plan', 'Magasins', 'Catégories', 'Entrée']);
  },
);
it('uses the web header translation key and retains root order around submenus', () => {
  const translate = (key: string, fallback: string) =>
    key === 'Products' ? 'Produits web' : fallback;
  const access = makeAccess({
    permissions: [],
    menus: [
      menu({ id: 1, label: 'stock', header: 'Products', route: '/products', order: 1 }),
      menu({
        id: 2,
        label: 'Services',
        route: '#',
        order: 2,
        children: [menu({ id: 3, label: 'Mes soins' })],
      }),
      menu({ id: 4, label: 'Stores', route: '/stores', order: 3 }),
    ],
  });
  const groups = backendMenuGroups(access, access.menus, translate);
  expect(groups.flatMap((g) => g.items).map((i) => i.label)).toEqual([
    'Produits web',
    'Mes soins',
    'Magasins',
  ]);
  expect(groups.map((g) => g.title)).toEqual(['Modules', 'Services', 'Modules']);
});
