import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SuppliersScreen from '@/features/commerce/SuppliersScreen';
import { OrderDetail } from '@/features/commerce/OrdersScreen';
import OrderForm from '@/features/commerce/OrderForm';
import ReportsScreen from '@/features/commerce/ReportsScreen';
import { commerceApi } from '@/features/commerce/api';
import { exportReport } from '@/features/commerce/reportExport';
import { apiGet } from '@/services/api/client';
import { makeAccess } from './fixtures/access';
jest.mock('@/features/commerce/reportExport', () => ({
  exportReport: jest.fn().mockResolvedValue('1 sur 1 lignes'),
}));
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
jest.mock('@/features/sales/SaleDetail', () => ({
  SaleDetail: ({ id }: { id: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>Vente créée {id}</Text>;
  },
}));
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
  fireEvent.press(screen.getByLabelText('Rapports de ventes'));
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
  fireEvent.press(screen.getByLabelText('Rapports de ventes'));
  await screen.findByText('8000 DH');
  expect(screen.queryByText('Exporter le rapport')).toBeNull();
  expect(commerceApi.write).not.toHaveBeenCalled();
});

it('opens the Stitch export centre and shares the selected report as CSV', async () => {
  jest.mocked(exportReport).mockResolvedValue('1 sur 1 lignes');
  setup(ReportsScreen);
  fireEvent.press(screen.getByText('Ouvrir le Centre d’Export'));
  expect(screen.getByText('Format du livrable')).toBeTruthy();
  expect(screen.getByText('Sections incluses')).toBeTruthy();
  fireEvent.press(screen.getByRole('radio', { name: 'Rapports de commandes' }));
  fireEvent.press(screen.getByLabelText('CSV compatible Excel'));
  fireEvent.press(screen.getByText('Générer et partager'));
  await waitFor(() =>
    expect(exportReport).toHaveBeenCalledWith(
      'orders',
      expect.objectContaining({ status: 'all' }),
      'csv',
      expect.anything(),
    ),
  );
  expect(await screen.findByText('1 sur 1 lignes')).toBeTruthy();
});

it.each([
  ['Rapports de ventes', 'sales'],
  ['Rapports d’entrées', 'entries'],
  ['Rapports de commandes', 'commandes'],
])('shows the whole-period collection rate in %s', async (label, rowsKey) => {
  jest.mocked(apiGet).mockResolvedValue({
    [rowsKey]: [],
    pagination: { total: 0, totalPages: 1 },
    summary: { totalAmount: 8000, totalPaid: 5000, totalDue: 3000 },
  });
  setup(ReportsScreen);
  fireEvent.press(screen.getByLabelText(label));
  expect(await screen.findByText('63%')).toBeTruthy();
  expect(screen.getByText('Taux d’encaissement')).toBeTruthy();
});
it('shows server best sellers for the entire period rather than just the visible page', async () => {
  jest.mocked(apiGet).mockResolvedValue({
    data: [{ productName: 'Produit page', items_sold: 1 }],
    total: 20,
    last_page: 2,
    summary: { productsCount: 20 },
    topProducts: [{ label: 'Produit champion', value: 75 }],
  });
  setup(ReportsScreen);
  fireEvent.press(screen.getByLabelText('Rapports de produits'));
  expect(await screen.findByText('Meilleures ventes')).toBeTruthy();
  expect(screen.getByText('Produit champion')).toBeTruthy();
  expect(screen.getByText('75 articles vendus')).toBeTruthy();
  expect(screen.getByText('Sur toute la période filtrée')).toBeTruthy();
});

it.each([
  ['Rapports de ventes', 'sales'],
  ['Rapports d’entrées', 'entries'],
  ['Rapports de commandes', 'commandes'],
])('keeps the global collection rate across pages of %s', async (label, rowsKey) => {
  jest.mocked(apiGet).mockImplementation(async (_path, options) => {
    const page = Number((options as { params?: { page?: number } })?.params?.page ?? 1);
    return {
      [rowsKey]: [
        {
          id: page,
          saleNumber: `SL-${page}`,
          entryNumber: `ENT-${page}`,
          orderNumber: `CMD-${page}`,
          totalAmount: 100,
          paidAmount: page === 1 ? 100 : 0,
          dueAmount: page === 1 ? 0 : 100,
        },
      ],
      pagination: { total: 40, totalPages: 2 },
      summary: { totalAmount: '8000.00', totalPaid: '5000.00', totalDue: '3000.00' },
    };
  });
  setup(ReportsScreen);
  fireEvent.press(screen.getByLabelText(label));
  expect(await screen.findByText('63%')).toBeTruthy();
  expect(screen.getByText('40 résultats')).toBeTruthy();
  fireEvent.press(screen.getByText('Suivant'));
  await waitFor(() =>
    expect(apiGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
    ),
  );
  expect(await screen.findByText('63%')).toBeTruthy();
  expect(screen.getByText('Sur toute la période filtrée')).toBeTruthy();
});

it('converts only after confirmation then opens the created sale', async () => {
  jest.mocked(commerceApi.validateOrder).mockResolvedValue({ id: 701 });
  setup(() => <OrderDetail id="18" onBack={jest.fn()} />);
  fireEvent.press(await screen.findByText('Valider et convertir en vente'));
  expect(commerceApi.validateOrder).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Confirmer'));
  expect(await screen.findByText('Vente créée 701')).toBeTruthy();
  expect(commerceApi.validateOrder).toHaveBeenCalledTimes(1);
  expect(commerceApi.validateOrder).toHaveBeenCalledWith('18');
});
it('dismisses conversion confirmation and shows the server failure', async () => {
  jest
    .mocked(commerceApi.validateOrder)
    .mockRejectedValue(new Error('Conversion impossible : stock indisponible.'));
  setup(() => <OrderDetail id="18" onBack={jest.fn()} />);
  fireEvent.press(await screen.findByText('Valider et convertir en vente'));
  fireEvent.press(screen.getByText('Confirmer'));
  expect(await screen.findByText('Conversion impossible : stock indisponible.')).toBeTruthy();
  expect(screen.queryByText('Convertir en vente ?')).toBeNull();
});
it('selects Created by its server code and prevents next until the client is chosen', async () => {
  jest.mocked(commerceApi.list).mockImplementation(async (path) => ({
    rows:
      path === '/statuses'
        ? [{ id: 55, code: 'created', label: 'created' }]
        : [{ id: 4, label: 'Client A' }],
    lastPage: 1,
    total: 1,
  }));
  setup(() => <OrderForm onClose={jest.fn()} onSaved={jest.fn()} />);
  expect(await screen.findByText('Créée')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Suivant' }).props.accessibilityState.disabled).toBe(
    true,
  );
  fireEvent.press(screen.getByText('Choisir : Client *'));
  fireEvent.press(await screen.findByText('Client A'));
  expect(screen.getByRole('button', { name: 'Suivant' }).props.accessibilityState.disabled).toBe(
    false,
  );
  fireEvent.press(screen.getByText('Suivant'));
  expect(screen.getByText('2. Produits')).toBeTruthy();
});

it('does not report success when conversion returns no sale identifier', async () => {
  jest.mocked(commerceApi.validateOrder).mockResolvedValue({ id: null });
  setup(() => <OrderDetail id="18" onBack={jest.fn()} />);
  fireEvent.press(await screen.findByText('Valider et convertir en vente'));
  fireEvent.press(screen.getByText('Confirmer'));
  expect(
    await screen.findByText(
      'La conversion n’a pas renvoyé de vente. Actualisez la commande pour vérifier son état avant de réessayer.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Convertir en vente ?')).toBeNull();
  expect(commerceApi.validateOrder).toHaveBeenCalledTimes(1);
});
