import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SuppliersScreen from '@/features/commerce/SuppliersScreen';
import { OrderDetail } from '@/features/commerce/OrdersScreen';
import OrderForm from '@/features/commerce/OrderForm';
import ReportsScreen from '@/features/commerce/ReportsScreen';
import { commerceApi } from '@/features/commerce/api';
import { apiGet } from '@/services/api/client';
import { makeAccess } from './fixtures/access';
let mockSupport = false;
const mockAccess = makeAccess({
  permissions: [
    'suppliers.view',
    'suppliers.manage',
    'orders.view',
    'orders.create',
    'orders.update',
    'orders.cancel',
    'orders.validate',
    'orders.return',
    'reports.view',
    'reports.export',
    'entries.view',
    'customers.view',
    'sales.view',
    'sales.apply_discount',
  ],
});
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { canGoBack: () => true, back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useIsFocused: () => true,
}));
jest.mock('@/features/access/useAccess', () => ({
  useAccess: () => ({ data: mockAccess, isPending: false, isError: false }),
}));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (select: (value: unknown) => unknown) =>
    select({
      session: {
        userId: 'actor',
        activeStore: { id: 'encrypted-store', name: 'Pharmacie' },
        supportAccess: mockSupport ? { tenantId: 14 } : undefined,
      },
    }),
}));
jest.mock('@/features/catalogue/StockDesign', () => ({ useDebounce: (value: string) => value }));
jest.mock('@/features/sales/SaleDetail', () => ({ SaleDetail: () => null }));
jest.mock('@/features/superadmin/AdminUI', () => ({
  currency: (value: unknown) => `${value} DH`,
  date: (value: unknown) => String(value),
  DateInput: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => {
    const { TextInput } = jest.requireActual('react-native');
    return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />;
  },
}));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  registerApiContext: jest.fn(),
  httpClient: { request: jest.fn() },
}));
jest.mock('@/features/commerce/api', () => {
  const actual = jest.requireActual('@/features/commerce/api');
  return {
    ...actual,
    commerceApi: {
      ...actual.commerceApi,
      list: jest.fn(),
      get: jest.fn(),
      references: jest.fn(),
      write: jest.fn(),
      archiveSupplier: jest.fn(),
      validateOrder: jest.fn(),
    },
  };
});
const clients: QueryClient[] = [];
function setup(Component: React.ComponentType) {
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
const supplier = {
  id: 7,
  name: 'Cooper Pharma',
  code: 'F-7',
  email: 'contact@example.org',
  phone: '0522000000',
  active: 1,
  CreditCeiling: 0,
  DefaultDiscount: 5,
};
const order = {
  id: 18,
  ref: 'CMD-18',
  date: '2026-10-18',
  customer_id: 4,
  customer: 'Client A',
  customersName: 'Client A',
  statuse_id: 3,
  commandestatusLabel: 'En cours',
  commandestatusCode: 'pending',
  total: 38,
  totalWithTax: 38,
  paid: 10,
  due: 28,
  tax: 0,
  discount: 0,
};
const items = [
  {
    id: 2,
    product_id: 42,
    title: 'Produit A',
    ref: '001234',
    qte: 2,
    price: 20,
    discount: 5,
    callDiscount: 2,
  },
];
beforeEach(() => {
  jest.useFakeTimers();
  mockSupport = false;
  jest.clearAllMocks();
  jest.mocked(commerceApi.list).mockImplementation(async (path) => ({
    rows:
      path === '/providerliste'
        ? [supplier]
        : path === '/listeCommandes'
          ? [order]
          : path === '/customerDropdown'
            ? [{ id: 4, label: 'Client A' }]
            : path === '/statuses'
              ? [{ id: 3, label: 'En cours' }]
              : [],
    lastPage: 1,
    total: 1,
  }));
  jest
    .mocked(commerceApi.get)
    .mockImplementation(async (path) =>
      path.startsWith('/provider/show')
        ? { Provider: [supplier], totalentreesComplete: 1500, totalentreesUnpaid: 300 }
        : { commande: order },
    );
  jest.mocked(commerceApi.references).mockResolvedValue(items);
  jest.mocked(commerceApi.write).mockResolvedValue({ id: 18 });
  jest.mocked(apiGet).mockResolvedValue({
    sales: [
      {
        id: 1,
        saleNumber: 'SL-1',
        date: '2026-10-18',
        customer: 'Client A',
        totalAmount: 10,
        paidAmount: 10,
        dueAmount: 0,
      },
    ],
    pagination: { total: 80, totalPages: 4 },
    summary: { totalAmount: 8000, totalPaid: 5000, totalDue: 3000, salesCount: 80 },
  });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  jest.clearAllTimers();
  jest.useRealTimers();
});
it('opens a supplier, edits supported fields and saves through the existing web endpoint', async () => {
  setup(SuppliersScreen);
  fireEvent.press(await screen.findByLabelText('Fournisseur Cooper Pharma'));
  fireEvent.press(await screen.findByText('Modifier'));
  fireEvent.changeText(screen.getByLabelText('E-mail *'), 'nouveau@example.org');
  fireEvent.press(screen.getByText('Enregistrer'));
  await waitFor(() =>
    expect(commerceApi.write).toHaveBeenCalledWith(
      'post',
      '/provider/update',
      expect.objectContaining({ id: '7', email: 'nouveau@example.org', name: 'Cooper Pharma' }),
    ),
  );
  expect(jest.mocked(commerceApi.write).mock.calls[0]![2]).not.toHaveProperty('store_id');
});
it('retains the order client, quantities and discounts across steps when editing', async () => {
  setup(() => <OrderForm data={{ order, items }} onClose={jest.fn()} onSaved={jest.fn()} />);
  fireEvent.press(screen.getByText('Suivant'));
  expect(screen.getByText('Produit A')).toBeTruthy();
  fireEvent.press(screen.getByText('Suivant'));
  expect(screen.getByLabelText('Acompte enregistré (DH)').props.value).toBe('10');
  fireEvent.press(screen.getByText('Enregistrer'));
  await waitFor(() =>
    expect(commerceApi.write).toHaveBeenCalledWith(
      'post',
      '/commandeupdate',
      expect.objectContaining({ id: '18', customer_id: 4, total: 38, due: 28 }),
    ),
  );
});
it('requires confirmation before cancelling and releasing an order reservation', async () => {
  setup(() => <OrderDetail id="18" onBack={jest.fn()} />);
  fireEvent.press(await screen.findByText('Annuler la commande'));
  expect(commerceApi.write).not.toHaveBeenCalled();
  expect(
    screen.getByText('Le stock réservé sera libéré et la commande sera annulée.'),
  ).toBeTruthy();
  fireEvent.press(screen.getByText('Confirmer'));
  await waitFor(() =>
    expect(commerceApi.write).toHaveBeenCalledWith('delete', '/commande/delete/18'),
  );
});
it('uses global report totals and applies the selected period to the server request', async () => {
  setup(ReportsScreen);
  fireEvent.press(screen.getByLabelText('Ventes et encaissements'));
  expect(await screen.findByText('8000 DH')).toBeTruthy();
  expect(screen.getByText('80 résultats')).toBeTruthy();
  fireEvent.press(screen.getByText('Période et filtres'));
  fireEvent.changeText(screen.getByLabelText('Du'), '2026-09-01');
  fireEvent.changeText(screen.getByLabelText('Au'), '2026-09-30');
  fireEvent.press(screen.getByText('Appliquer'));
  await waitFor(() =>
    expect(apiGet).toHaveBeenCalledWith(
      '/reportSales',
      expect.objectContaining({
        params: expect.objectContaining({
          startDate: '2026-09-01',
          endDate: '2026-09-30',
          page: 1,
        }),
      }),
    ),
  );
});
it('keeps supplier, order and reporting write/export actions hidden during assistance', async () => {
  mockSupport = true;
  const supplierScreen = setup(SuppliersScreen);
  await screen.findByText('Cooper Pharma');
  expect(screen.queryByText('Ajouter')).toBeNull();
  supplierScreen.unmount();
  const orderScreen = setup(() => <OrderDetail id="18" onBack={jest.fn()} />);
  await screen.findByText('Produits réservés');
  expect(screen.queryByText('Modifier la commande')).toBeNull();
  expect(screen.queryByText('Valider et convertir en vente')).toBeNull();
  expect(screen.queryByText('Annuler la commande')).toBeNull();
  orderScreen.unmount();
  setup(ReportsScreen);
  fireEvent.press(screen.getByLabelText('Ventes et encaissements'));
  await screen.findByText('8000 DH');
  expect(screen.queryByText('Exporter le rapport')).toBeNull();
  expect(commerceApi.write).not.toHaveBeenCalled();
});
