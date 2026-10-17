/* eslint-disable @typescript-eslint/no-require-imports */
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tenants } from '@/features/superadmin/Tenants';
import { Billings } from '@/features/superadmin/Billings';
import { ActionForm } from '@/features/superadmin/ActionForm';
import { PlanImpactReview } from '@/features/superadmin/PlanImpactReview';
import { PlanMatrix } from '@/features/superadmin/PlanMatrix';
import { AccessWorkspace } from '@/features/superadmin/AccessWorkspace';
import { platformApi } from '@/features/superadmin/api';
jest.mock('@/features/superadmin/api', () => ({
  platformApi: { get: jest.fn(), list: jest.fn(), write: jest.fn() },
}));
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { push: jest.fn(), replace: jest.fn(), canGoBack: () => true, back: jest.fn() },
}));
jest.mock('@/features/access/useAccess', () => ({
  useAccess: () => ({
    data: {
      permissions: [
        'platform.tenants.manage',
        'platform.metrics.view',
        'platform.plans.manage',
        'platform.subscriptions.manage',
      ],
    },
  }),
}));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (selector: (s: unknown) => unknown) =>
    selector({ session: { role: 'SuperAdmin' } }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@/components/ui/AppText', () => ({
  AppText: require('react-native').Text,
  useLatinFonts: () => true,
}));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/features/stores/components/ExpirationDateField', () => ({
  ExpirationDateField: () => null,
}));
jest.mock('@/features/superadmin/billingPdf', () => ({ openBillingPdf: jest.fn() }));
const tenant = {
  store_id: 8,
  name: 'Pharmacie Centrale',
  created_at: '2026-10-01',
  owner: { id: 3, name: 'Nadia', email: 'nadia@example.test' },
  state: { active: true, suspended: false },
  subscription: { plan_name: 'Pro', end_date: '2026-12-01', days_left: 45 },
  usage: { users: 2, users_limit: 5, stores: 1, stores_limit: 2 },
  activity: {
    sales_count: 4,
    sales_total: 900,
    crm: { sessions: 3, packages: 1, appointments: 5, total: 600 },
  },
};
const invoice = {
  id: 44,
  active: 1,
  amount: '100',
  tax: '20',
  total: '120',
  billing_date: '2026-10-01',
  due_date: '2026-10-20',
  transaction_id: null,
  subscription: { user: { name: 'Nadia', email: 'nadia@example.test' }, plan: { name: 'Pro' } },
  status: { code: 'unpaid', designation: 'En attente' },
};
const clients: QueryClient[] = [];
afterEach(() => {
  for (const client of clients) client.clear();
  clients.length = 0;
});
function setup(element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(platformApi.get)
    .mockImplementation(async (path) =>
      path.startsWith('/statusliste') ? [{ value: 7, title: 'En attente' }] : [],
    );
  jest.mocked(platformApi.list).mockImplementation(async (path) => ({
    data: path === '/subscription-billings' ? [invoice] : [tenant],
    total: 1,
    last_page: 1,
    current_page: 1,
    per_page: 25,
  }));
  jest.mocked(platformApi.write).mockResolvedValue({});
});
it('migrates only a selected subscription after a reason and confirmation', async () => {
  const screen = setup(
    <PlanImpactReview
      versionId={9}
      published
      impact={{
        plan_version_id: 9,
        subscriptions: 2,
        with_lost_features: 1,
        with_exceeded_quotas: 0,
        rows: [
          {
            subscription_id: 'sub-current',
            account_id: 3,
            current_plan_version_id: 9,
            features_gained: [],
            features_lost: [],
            quotas_exceeded: [],
          },
          {
            subscription_id: 'sub-move',
            account_id: 4,
            current_plan_version_id: 7,
            features_gained: [],
            features_lost: ['crm'],
            quotas_exceeded: [],
          },
        ],
      }}
    />,
  );
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.changeText(
    screen.getByLabelText('Motif de la migration'),
    'Migration demandée par le compte',
  );
  fireEvent.press(screen.getByLabelText('Migrer la sélection (1)'));
  expect(platformApi.write).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Confirmer la migration'));
  await waitFor(() =>
    expect(platformApi.write).toHaveBeenCalledWith(
      'post',
      '/access-admin/plan-versions/9/migrate',
      { subscription_ids: ['sub-move'], reason: 'Migration demandée par le compte' },
    ),
  );
});
it('keeps the access sections in one workspace and only exposes permitted tabs', () => {
  const screen = setup(<AccessWorkspace />);
  expect(screen.getByRole('tab', { name: 'Vue d’ensemble' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Matrice des plans' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Définitions des quotas' })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: 'Modules et permissions' })).toBeNull();
  expect(screen.queryByRole('tab', { name: 'Historique administratif' })).toBeNull();
});
it('compares plan versions and only saves draft changes after confirmation with its lock', async () => {
  const terms = {
    features: [] as string[],
    quotas: { 'users.total': 5 },
    trials: { crm: { days: 14, active: true, features: ['crm'], quotas: {} } },
  };
  jest.mocked(platformApi.get).mockImplementation(async (path) => {
    if (path === '/superadmin/plans')
      return [{ id: 1, name: 'Basic', price: 149, duration_in_days: 30 }] as never;
    if (path === '/access-admin/modules')
      return {
        modules: [
          {
            id: 1,
            key: 'crm',
            label_key: 'CRM',
            features: [{ id: 1, key: 'crm', label_key: 'Soins' }],
            permissions: [],
          },
        ],
        quotas: [],
      } as never;
    if (path.endsWith('/versions')) return [{ id: 4, version: 2, status: 'draft' }] as never;
    return {
      id: 4,
      version: 2,
      status: 'draft',
      terms,
      lock_version: 7,
      notes: 'Test',
      subscriptions_count: 0,
    } as never;
  });
  const screen = setup(<PlanMatrix />);
  await screen.findByText('Basic');
  await waitFor(() => expect(screen.getByRole('checkbox')).toBeTruthy());
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByLabelText('Enregistrer le brouillon'));
  expect(platformApi.write).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Enregistrer'));
  await waitFor(() =>
    expect(platformApi.write).toHaveBeenCalledWith('put', '/access-admin/plan-versions/4', {
      ...terms,
      features: ['crm'],
      notes: 'Test',
      lock_version: 7,
    }),
  );
});
it('loads a real store card and sends subscription filters to the backend', async () => {
  const screen = setup(<Tenants />);
  await screen.findByText('Pharmacie Centrale');
  expect(screen.getByText('3 séances · 1 forfaits')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Filtres'));
  await waitFor(() =>
    expect(platformApi.get).toHaveBeenCalledWith('/superadmin/plans', {}, expect.anything()),
  );
  fireEvent.press(screen.getByLabelText('Abonnement : Tous'));
  fireEvent.press(screen.getByLabelText('Expiration sous 7 jours'));
  await waitFor(() =>
    expect(platformApi.list).toHaveBeenLastCalledWith(
      '/superadmin/tenants',
      expect.objectContaining({ status: 'expiring', page: 1 }),
      expect.anything(),
    ),
  );
  expect(platformApi.write).not.toHaveBeenCalled();
});
it('requires funds confirmation and a second explicit confirmation before validating a bill', async () => {
  const screen = setup(<Billings />);
  fireEvent.press(await screen.findByLabelText('Consulter la facture'));
  const validate = screen.getByLabelText('Valider et marquer la facture payée');
  fireEvent.press(validate);
  expect(platformApi.write).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByLabelText('Valider et marquer la facture payée'));
  expect(platformApi.write).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Confirmer'));
  await waitFor(() =>
    expect(platformApi.write).toHaveBeenCalledWith('post', '/subscription-billings/44/validate', {
      transaction_id: undefined,
    }),
  );
  expect(platformApi.write).toHaveBeenCalledTimes(1);
});
it('keeps changes after an API conflict and sends the original concurrency version', async () => {
  jest
    .mocked(platformApi.write)
    .mockRejectedValue(new Error('Version modifiée par un autre administrateur'));
  const close = jest.fn(),
    screen = setup(
      <ActionForm
        title="Modifier"
        path="/access-admin/modules/2"
        method="put"
        fields={[{ key: 'reason', label: 'Motif', required: true }]}
        initial={{ reason: 'Correction' }}
        extra={{ lock_version: 4 }}
        onClose={close}
      />,
    );
  fireEvent.press(screen.getByLabelText('Vérifier les modifications'));
  fireEvent.press(screen.getByLabelText('Enregistrer'));
  await waitFor(() => expect(screen.getAllByText(/Version modifiée/).length).toBeGreaterThan(0));
  expect(platformApi.write).toHaveBeenCalledTimes(1);
  expect(platformApi.write).toHaveBeenCalledWith('put', '/access-admin/modules/2', {
    reason: 'Correction',
    lock_version: 4,
  });
  expect(close).not.toHaveBeenCalled();
});
