import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiGet, httpClient } from '@/services/api/client';
import { commerceApi } from '@/features/commerce/api';
import AgeGroupsScreen from '@/features/admin/AgeGroupsScreen';
import AuditScreen from '@/features/admin/AuditScreen';
import CompanySettingsScreen from '@/features/admin/CompanySettingsScreen';
import InvoicesScreen from '@/features/admin/InvoicesScreen';
import InvoiceForm from '@/features/admin/InvoiceForm';
import TeamUsersScreen from '@/features/admin/TeamUsersScreen';
import AdminSubscriptionsScreen from '@/features/admin/AdminSubscriptionsScreen';
import FinanceAlerts from '@/features/finance/AlertsScreen';
import FinanceCheques from '@/features/finance/ChequesScreen';
import FinanceCredits from '@/features/finance/CreditsScreen';
import { makeAccess } from './fixtures/access';
let mockReadOnly = false;
const mockAccess = makeAccess({
  permissions: [
    'settings.view',
    'settings.manage',
    'invoices.view',
    'invoices.create_manual',
    'invoices.create_from_sale',
    'invoices.update',
    'invoices.finalize',
    'invoices.settings.manage',
    'invoices.group_sales',
    'invoices.download_pdf',
    'team.users.view',
    'team.users.manage',
    'team.stores.assign',
    'subscription.view',
    'subscription.manage',
    'catalog.references.view',
    'catalog.references.manage',
    'audit.view',
    'payments.view',
    'payments.collect',
    'cheques.manage',
    'credits.view',
  ],
});
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { canGoBack: () => true, back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useIsFocused: () => true,
}));
jest.mock('@/features/access/useAccess', () => ({
  useAccess: () => ({ data: mockAccess, isPending: false, isError: false }),
}));
jest.mock('@/features/access/hooks', () => ({
  useQuota: () => ({ state: 'limited', used: 1, limit: 5, exceeded: false }),
}));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (select: (state: unknown) => unknown) =>
    select({
      session: {
        userId: 'actor',
        activeStore: { id: 'encrypted-store', name: 'Pharmacie' },
        supportAccess: mockReadOnly ? {} : undefined,
      },
    }),
}));
jest.mock('@/features/catalogue/StockDesign', () => ({ useDebounce: (v: string) => v }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  registerApiContext: jest.fn(),
  httpClient: { request: jest.fn(), get: jest.fn() },
}));
jest.mock('@/features/commerce/api', () => ({
  ...jest.requireActual('@/features/commerce/api'),
  commerceApi: { ...jest.requireActual('@/features/commerce/api').commerceApi, list: jest.fn() },
}));
jest.mock('@/features/superadmin/AdminUI', () => ({
  currency: (v: unknown) => `${v} DH`,
  date: (v: unknown) => String(v ?? '—'),
  DateInput: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => {
    const { TextInput } = jest.requireActual('react-native');
    return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />;
  },
}));
const clients: QueryClient[] = [];
const company = {
  id: 7,
  Name: 'Pharmacie Centrale',
  Email: 'contact@pharma.ma',
  Phone: '0522000000',
  Active: 1,
  Currency: 'MAD',
  Tva: 20,
  PeriodSendAlert: 90,
  OrgCode: 'ICE-7',
  config: '{"loyalty":{"enabled":false}}',
};
const invoice = {
  id: 12,
  ref: 'FAC-12',
  customer_id: 4,
  customer: { FirstName: 'Amine', LastName: 'B' },
  invoice_date: '2026-10-22',
  status: { code: 'draft', label: 'Brouillon' },
  type: { label: 'Facture' },
  total_ttc: 324,
  subtotal_ht: 300,
  taxable_base: 270,
  tax_amount: 54,
  items: [{ label: 'Article', quantity: 3, unit_price: 100, total_ttc: 324 }],
  sales: [],
};
const invoiceSettings = {
  allow_line_discount: true,
  max_line_discount_percent: 10,
  allow_invoice_discount: true,
  max_invoice_discount_percent: 15,
  rounding_mode: 'round',
  rounding_precision: 2,
};
function mount(Component: React.ComponentType) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <Component />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.useFakeTimers();
  mockReadOnly = false;
  jest.clearAllMocks();
  jest.mocked(apiGet).mockImplementation(async (path) => {
    if (path === '/age-groups')
      return { status: 'success', data: [{ id: 1, name: 'Adultes', min_age: 18, max_age: 64 }] };
    if (path === '/company/show/1') return [company];
    if (path === '/invoice-settings') return { success: true, data: invoiceSettings };
    if (path === '/statuses') return { data: [{ id: 2, code: 'draft', label: 'Brouillon' }] };
    if (path === '/invoices')
      return { success: true, data: [invoice], meta: { total: 1, last_page: 1 } };
    if (path === '/invoices/12') return { success: true, data: invoice };
    if (path === '/usersListe')
      return {
        data: [
          { id: 3, firstName: 'Sara', lastName: 'M', email: 'sara@example.ma', role: 4, active: 1 },
        ],
        total: 1,
        last_page: 1,
      };
    if (path === '/users/show/3')
      return [
        {
          id: 3,
          firstName: 'Sara',
          lastName: 'M',
          email: 'sara@example.ma',
          phone: '0600000000',
          role: 4,
          active: 1,
        },
      ];
    if (path === '/subscriptions/my')
      return [
        {
          id: 8,
          plan: { name: 'Pro', price: 199, features: ['Stock'] },
          status: { code: 'active', label: 'Actif' },
          start_date: '2026-10-22',
          end_date: '2026-11-22',
        },
      ];
    if (path === '/subscription-billings')
      return {
        status: true,
        data: {
          data: [
            {
              id: 20,
              ref: 'ABO-20',
              total: 199,
              billing_date: '2026-10-22',
              status: { code: 'paid' },
            },
          ],
          total: 1,
          last_page: 1,
        },
      };
    if (path === '/audit-logs')
      return {
        status: 'success',
        data: {
          data: [
            {
              id: 5,
              action: 'Modification utilisateur',
              firstName: 'Amine',
              created_at: '2026-10-22',
              before: { role: 'Vendeur', password: 'old-secret' },
              after: { role: 'Gestionnaire', password: 'new-secret' },
            },
          ],
          total: 1,
          last_page: 1,
        },
      };
    return { status: true, data: [] };
  });
  jest.mocked(httpClient.request).mockResolvedValue({ data: { success: true, data: { id: 12 } } });
  jest.mocked(commerceApi.list).mockImplementation(async (path) => ({
    rows:
      path === '/customerDropdown'
        ? [{ id: 4, label: 'Client A' }]
        : path === '/types/invoice'
          ? [{ id: 1, label: 'Facture' }]
          : [{ id: 2, code: 'draft', label: 'Brouillon' }],
    lastPage: 1,
    total: 1,
  }));
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  jest.clearAllTimers();
  jest.useRealTimers();
});
it('validates and creates an age group with the actual endpoint', async () => {
  mount(AgeGroupsScreen);
  await screen.findByText('Adultes');
  fireEvent.press(screen.getByText('Ajouter un groupe d’âge'));
  fireEvent.changeText(screen.getByLabelText('Nom *'), 'Enfants');
  fireEvent.changeText(screen.getByLabelText('Âge minimum *'), '0');
  fireEvent.changeText(screen.getByLabelText('Âge maximum *'), '17');
  fireEvent.press(screen.getByText('Enregistrer'));
  await waitFor(() =>
    expect(httpClient.request).toHaveBeenCalledWith({
      method: 'post',
      url: '/age-groups',
      data: { name: 'Enfants', min_age: 0, max_age: 17, description: '' },
    }),
  );
});
it('saves company data without deleting invoice settings or uploading the old image', async () => {
  mount(CompanySettingsScreen);
  await screen.findByDisplayValue('Pharmacie Centrale');
  fireEvent.changeText(screen.getByLabelText('Nom de l’entreprise *'), 'Pharmacie Nouvelle');
  fireEvent.press(screen.getByText('Enregistrer'));
  await waitFor(() =>
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/company/update',
        data: expect.objectContaining({
          id: 7,
          Name: 'Pharmacie Nouvelle',
          Currency: 'MAD',
          Tva: 20,
          PeriodSendAlert: 90,
          config: company.config,
        }),
      }),
    ),
  );
  expect(jest.mocked(httpClient.request).mock.calls[0]?.[0]?.data).not.toHaveProperty('image');
});
it('shows actual audit before/after fields with secrets redacted and no edit action', async () => {
  mount(AuditScreen);
  fireEvent.press(await screen.findByText('Modification utilisateur'));
  expect(await screen.findByText('Vendeur')).toBeTruthy();
  expect(screen.getByText('Gestionnaire')).toBeTruthy();
  expect(screen.queryByText('old-secret')).toBeNull();
  expect(screen.queryByText('new-secret')).toBeNull();
  expect(screen.queryByText('Enregistrer')).toBeNull();
});
it('closes an invoice only after confirmation and refreshes the server state', async () => {
  mount(InvoicesScreen);
  fireEvent.press(await screen.findByText('FAC-12'));
  await screen.findByText('Total TTC');
  fireEvent.press(screen.getByText('Clôturer'));
  expect(httpClient.request).not.toHaveBeenCalled();
  expect(screen.getByText('Clôturer la facture ?')).toBeTruthy();
  fireEvent.press(screen.getAllByRole('button', { name: 'Clôturer' })[0]!);
  await waitFor(() =>
    expect(httpClient.request).toHaveBeenCalledWith({
      method: 'post',
      url: '/invoices/12/close',
      data: undefined,
    }),
  );
});
it('creates a manual invoice with numeric tax lines via /invoices/manual', async () => {
  mount(() => <InvoiceForm mode="manual" onBack={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.press(screen.getByText('Choisir : Client *'));
  fireEvent.press(await screen.findByText('Client A'));
  fireEvent.press(screen.getByText('Choisir : Type *'));
  fireEvent.press(await screen.findByText('Facture'));
  fireEvent.press(screen.getByText('Suivant'));
  fireEvent.press(await screen.findByText('Ajouter une ligne'));
  fireEvent.changeText(screen.getByLabelText('Désignation *'), 'Article test');
  fireEvent.changeText(screen.getByLabelText('Quantité *'), '3');
  fireEvent.changeText(screen.getByLabelText('Prix unitaire (DH) *'), '100');
  fireEvent.changeText(screen.getByLabelText('TVA (%) *'), '20');
  fireEvent.changeText(screen.getByLabelText('Remise'), '10');
  fireEvent.press(screen.getByText('Ajouter au document'));
  fireEvent.press(screen.getByText('Suivant'));
  expect(await screen.findByText('324 DH')).toBeTruthy();
  fireEvent.press(screen.getByText('Enregistrer'));
  await waitFor(() =>
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/invoices/manual',
        data: expect.objectContaining({
          customer_id: '4',
          status_id: '2',
          type_id: '1',
          items: [
            {
              label: 'Article test',
              quantity: 3,
              unit_price: 100,
              tax_rate: 20,
              discount_type: 'percent',
              discount_value: 10,
            },
          ],
        }),
      }),
    ),
  );
});
it('loads subscription history and opens a user editor without platform routes', async () => {
  const sub = mount(AdminSubscriptionsScreen);
  expect(await screen.findByText('Pro')).toBeTruthy();
  expect(await screen.findByText('ABO-20')).toBeTruthy();
  sub.unmount();
  mount(TeamUsersScreen);
  fireEvent.press(await screen.findByText('Sara M'));
  expect(await screen.findByDisplayValue('sara@example.ma')).toBeTruthy();
  expect(
    jest.mocked(apiGet).mock.calls.some((call) => String(call[0]).startsWith('/superadmin')),
  ).toBe(false);
});
it('hides write actions in assistance and never sends a mutation', async () => {
  mockReadOnly = true;
  const ages = mount(AgeGroupsScreen);
  await screen.findByText('Adultes');
  expect(screen.queryByText('Ajouter un groupe d’âge')).toBeNull();
  ages.unmount();
  mount(InvoicesScreen);
  fireEvent.press(await screen.findByText('FAC-12'));
  await screen.findByText('Total TTC');
  expect(screen.queryByText('Clôturer')).toBeNull();
  expect(screen.queryByText('Modifier la facture')).toBeNull();
  expect(httpClient.request).not.toHaveBeenCalled();
});
const financeAlert = {
  uid: 'alert-a',
  title: 'Stock critique',
  message: 'Stock inférieur au seuil.',
  type: 'stock_low',
  priority: 'critical',
  is_read: false,
  created_at: '2026-10-23',
};
const financeCheque = {
  uid: 'cheque-a',
  cheque_number: '001234',
  amount: 3200,
  issue_date: '2026-10-18',
  due_date: '2026-10-23',
  status: { code: 'pending' },
  type: { code: 'incoming' },
  customer: { name: 'Client A' },
  movements: [],
};
function financeFixtures() {
  const fallback = jest.mocked(apiGet).getMockImplementation();
  jest.mocked(apiGet).mockImplementation(async (path, options) => {
    if (path === '/alerts/alert-a') return { success: true, data: financeAlert };
    if (path === '/alerts')
      return {
        success: true,
        data: { data: [financeAlert], pagination: { current_page: 1, last_page: 1, total: 1 } },
      };
    if (path === '/cheques/cheque-a') return { success: true, data: financeCheque };
    if (path === '/credit-payment/4')
      return {
        customer_id: 4,
        customer_name: 'Client A',
        total_credit: 500,
        number_of_unpaid_sales: 1,
        credit_details: [
          {
            sale_id: 7,
            sale_ref: 'SL-7',
            total_ttc: 600,
            paid: 100,
            credit: 500,
            date: '2026-10-18',
          },
        ],
      };
    if (path === '/types/payments') return [{ id: 5, code: 'cash', label: 'Espèces' }];
    if (path === '/credit-payment/4/history')
      return [
        {
          id: 9,
          sale_ref: 'SL-7',
          amount_paid: 100,
          payment_method: 'cash',
          created_at: '2026-10-18',
        },
      ];
    return fallback!(path, options);
  });
}
it('opens an alert and marks it read using its UID', async () => {
  financeFixtures();
  mount(FinanceAlerts);
  fireEvent.press(await screen.findByText('Stock critique'));
  await screen.findByText('Stock inférieur au seuil.');
  fireEvent.press(screen.getByText('Marquer comme lue'));
  await waitFor(() =>
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'post', url: '/alerts/alert-a/read' }),
    ),
  );
});
it('requires confirmation before a cheque deposit and never offers clearing a pending cheque', async () => {
  financeFixtures();
  mount(() => <FinanceCheques id="cheque-a" />);
  await screen.findByText('001234');
  expect(screen.queryByText('Encaisser le chèque')).toBeNull();
  fireEvent.press(screen.getByText('Déposer le chèque'));
  expect(httpClient.request).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Confirmer'));
  await waitFor(() =>
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'post', url: '/cheques/cheque-a/deposit' }),
    ),
  );
});
it('guards credit overpayment and sends only the confirmed customer payment', async () => {
  financeFixtures();
  mount(() => <FinanceCredits id="4" />);
  fireEvent.press(await screen.findByText('Encaisser un règlement'));
  await screen.findByText('Mode de règlement *');
  fireEvent.changeText(screen.getByLabelText('Montant du règlement (DH) *'), '700');
  fireEvent.press(screen.getByText('Enregistrer le règlement'));
  expect(
    screen.getByRole('button', { name: 'Enregistrer le règlement' }).props.accessibilityState
      .disabled,
  ).toBe(true);
  expect(httpClient.request).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Montant du règlement (DH) *'), '200');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Enregistrer le règlement' }).props.accessibilityState
        .disabled,
    ).toBe(false),
  );
  fireEvent.press(screen.getByText('Enregistrer le règlement'));
  expect(httpClient.request).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Encaisser'));
  await waitFor(() =>
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/credit-payment/pay',
        data: { customer_id: 4, amount: 200, payment_method: 'cash', reference: '' },
      }),
    ),
  );
});
it('keeps cheque actions read-only during assistance', async () => {
  financeFixtures();
  mockReadOnly = true;
  mount(() => <FinanceCheques id="cheque-a" />);
  await screen.findByText('001234');
  expect(screen.queryByText('Déposer le chèque')).toBeNull();
  expect(screen.queryByText('Modifier le chèque')).toBeNull();
  expect(httpClient.request).not.toHaveBeenCalled();
});
