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

it('retains unsupported role menus as disabled entries in backend order', () => {
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
    ['Fournisseurs', true, 'À développer sur mobile'],
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
