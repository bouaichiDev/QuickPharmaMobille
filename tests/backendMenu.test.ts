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
    ['Ventes', true, 'À développer sur mobile'],
    ['Fournisseurs', true, 'À développer sur mobile'],
  ]);
});

it('also shows a visible leaf with no route as awaiting mobile implementation', () => {
  expect(
    backendMenuGroups(makeAccess({ menus: [menu({ route: null, label: 'Nouveau module' })] }))[0]
      ?.items[0],
  ).toMatchObject({ label: 'Nouveau module', disabled: true });
});
