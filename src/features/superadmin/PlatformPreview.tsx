/** Isolated visual fixtures; no authentication or HTTP/business writes. */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PlatformContext } from './PlatformContext';
import { PlatformHome } from './Dashboard';
import { Tenants, TenantDetail } from './Tenants';
import { Billings } from './Billings';
import { platformModules } from './modules';
import type { Params } from './api';
const names = ['Pharmacie Centrale Saint-Germain', 'Pharmacie de la Corniche', 'Pharmacie Al Amal'];
function createFixtures() {
  const tenants = names.map((name, i) => ({
    store_id: i + 1,
    name,
    created_at: '2026-01-15',
    state: { active: i !== 2, suspended: i === 2, suspended_at: null, suspension_reason: null },
    owner: {
      id: i + 20,
      name: ['Dr. Youssef Bennani', 'Dr. Leila Mansour', 'Dr. Karim Tazi'][i],
      email: `officine${i + 1}@example.test`,
    },
    subscription: {
      id: String(i + 1),
      plan_id: 1,
      plan_name: 'Officine Pro · Annuel',
      end_date: '2027-04-15',
      days_left: 365,
      plan_price: 1700,
    },
    usage: {
      users: 8,
      users_limit: 10,
      stores: 2,
      stores_limit: 3,
      users_exceeded: false,
      stores_exceeded: false,
    },
    activity: {
      sales_count: 1240,
      sales_total: 186400,
      crm: {
        total: 18200,
        sessions: 42,
        packages: 18,
        appointments: 89,
        services: 6,
        paid: 17400,
        due: 800,
      },
    },
    users: [
      {
        id: 20,
        firstName: 'Youssef',
        lastName: 'Bennani',
        email: 'officine1@example.test',
        active: 1,
        role_code: 'Admin',
      },
    ],
    billings: [],
  }));
  const flow = {
    count: 1240,
    total: 186400,
    paid: 178900,
    due: 7500,
    last_30_days: { total: 186400, count: 1240 },
    this_month: { total: 186400, count: 1240 },
  };
  const bills = [
    {
      id: 412,
      active: 1,
      amount: '20000',
      tax: '4000',
      total: '24000',
      billing_date: '2026-10-01',
      due_date: '2026-10-30',
      transaction_id: null,
      subscription: {
        user: { name: 'Dr. Youssef Bennani', email: 'officine1@example.test' },
        plan: { name: 'Officine Pro · Annuel' },
      },
      status: { code: 'unpaid', designation: 'En attente' },
      payment_method: { designation: 'Virement bancaire' },
    },
  ];
  return {
    async get<T>(path: string): Promise<T> {
      let data: unknown = [];
      if (path === '/superadmin/overview')
        data = {
          tenants: { stores_total: 152 },
          revenue: {
            mrr: 284000,
            arr: 3408000,
            collected_total: 258000,
            pending_total: 26500,
            pending_count: 14,
          },
          subscriptions: { active: 142, expiring_in_7_days: 7 },
        };
      else if (path === '/superadmin/mobile/dashboard')
        data = {
          stores_active: 148,
          stores_suspended: 4,
          registrations: [95, 104, 116, 125, 136, 148].map((count, i) => ({
            month: `2026-${String(i + 1).padStart(2, '0')}`,
            count,
          })),
          plans: [
            { id: 1, name: 'Officine Pro', count: 96 },
            { id: 2, name: 'Multi-officines', count: 37 },
            { id: 3, name: 'Starter Dispensaire', count: 15 },
          ],
        };
      else if (path === '/superadmin/dashboard/snapshot')
        data = {
          sales_today: { total: 12450 },
          active_stores_today: 142,
          new_today: { stores: 3, users: 8 },
          recent_activity: [
            {
              id: 1,
              action: 'Renouvellement de l’abonnement Pro annuel',
              store_name: 'Pharmacie Ibn Sina',
              user_email: 'officine@example.test',
              created_at: '2026-10-16',
            },
          ],
        };
      else if (path === '/superadmin/plans') data = [{ id: 1, name: 'Officine Pro', price: 1700 }];
      else if (path.startsWith('/statusliste'))
        data = [
          { value: 1, title: 'En attente', code: 'unpaid' },
          { value: 2, title: 'Payée', code: 'paid' },
        ];
      else if (path.endsWith('/stats'))
        data = {
          sales: flow,
          purchases: { ...flow, count: 28, total: 112400, paid: 95000, due: 17400 },
          orders: { ...flow, count: 15 },
          crm: tenants[0]!.activity.crm,
          catalogue: {
            products: 1420,
            out_of_stock: 4,
            low_stock: 12,
            stock_value_buying: 485000,
            stock_value_selling: 720000,
            categories: 18,
            providers: 8,
          },
          inventory: {
            items_total: 3850,
            by_status: { disponible: 3800 },
            expired: 0,
            expiring_in_30_days: 8,
            locations: 14,
          },
          invoicing: { count: 12, total_ttc: 186400, closed: 11 },
          customers: { total: 840, active: 320 },
          payments: { count: 600, received_total: 178900 },
          team: { users: 8 },
        };
      else if (path.endsWith('/monthly-stats'))
        data = {
          months: [1, 2, 3, 4, 5, 6].map((n) => ({
            month: `2026-0${n}`,
            sales: 12450 * n,
            purchases: 8000 * n,
            orders: 1500 * n,
            crm: 600 * n,
          })),
        };
      else if (path.startsWith('/superadmin/tenants/'))
        data = tenants[Number(path.split('/')[3]) - 1] ?? tenants[0];
      return data as T;
    },
    async list<T>(path: string, params: Params = {}) {
      const data: unknown[] =
        path === '/superadmin/tenants'
          ? tenants.filter(
              (t) =>
                (!params.search ||
                  `${t.name} ${t.owner.email}`
                    .toLowerCase()
                    .includes(String(params.search).toLowerCase())) &&
                (!params.state ||
                  (params.state === 'suspended' ? t.state.suspended : !t.state.suspended)),
            )
          : path === '/subscription-billings'
            ? bills.filter(
                (b) =>
                  !params.status_id ||
                  (String(params.status_id) === '2'
                    ? b.status.code === 'paid'
                    : b.status.code === 'unpaid'),
              )
            : [];
      return { data: data as T[], current_page: 1, last_page: 1, per_page: 25, total: data.length };
    },
    async write<T>(_method: string, path: string): Promise<T> {
      if (!path.endsWith('/validate'))
        throw new Error('Cette action est disponible uniquement dans l’application connectée.');
      bills[0]!.status = { code: 'paid', designation: 'Payée' };
      return {} as T;
    },
  };
}
export function PlatformPreview({ initial }: { initial: string }) {
  const [view, setView] = useState(initial),
    [query] = useState(
      () =>
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        }),
    ),
    [api] = useState(createFixtures);
  const items: [string, string, IconName][] = [
    ['sa-dashboard', 'Tableau', 'dashboard'],
    ['sa-tenants', 'Établissements', 'storefront'],
    ['sa-billings', 'Abonnements', 'receipt-long'],
  ];
  return (
    <QueryClientProvider client={query}>
      <PlatformContext.Provider
        value={{
          api,
          permissions: platformModules.map((m) => m.permission),
          scope: 'stitch-preview',
          navigate: setView,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: '#e5eeff', padding: 5 }}>
            <AppText variant="labelSm">
              DÉMONSTRATION · Données fictives, aucune modification de l’API
            </AppText>
          </View>
          {view === 'sa-dashboard' ? (
            <PlatformHome />
          ) : view === 'sa-tenants' ? (
            <Tenants onSelect={() => setView('sa-tenant')} />
          ) : view === 'sa-tenant' ? (
            <TenantDetail id={1} />
          ) : (
            <Billings />
          )}
          <View
            style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#dce9ff' }}
          >
            {items.map(([key, label, icon]) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={label}
                key={key}
                onPress={() => setView(key)}
                style={{ flex: 1, alignItems: 'center', minHeight: 44, gap: 5 }}
              >
                <Icon name={icon} color="primary" />
                <AppText variant="labelSm">{label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </PlatformContext.Provider>
    </QueryClientProvider>
  );
}
