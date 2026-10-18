import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StoresScreen from '@/features/commerce/StoresScreen';
import CustomersScreen from '@/features/commerce/CustomersScreen';
import EntriesScreen from '@/features/commerce/EntriesScreen';
import EntryForm, { LineEditor, ProductPicker } from '@/features/commerce/EntryForm';
import { stockApi } from '@/features/catalogue/stockApi';
import { commerceApi } from '@/features/commerce/api';
import { makeAccess } from './fixtures/access';
let mockSupport = false;
it.each([false, true])(
  'requires an expiration date only for expiring products: %s',
  (hasExpiration) => {
    const saved = jest.fn();
    setup(() => (
      <LineEditor
        line={{
          key: 'new-1',
          product_id: 42,
          title: 'Produit',
          ref: '42',
          qte: 1,
          price: 3,
          dateExperation: null,
          hasExpiration,
        }}
        onClose={jest.fn()}
        onSave={saved}
      />
    ));
    expect(!!screen.queryByLabelText('Expiration *')).toBe(hasExpiration);
    fireEvent.press(screen.getByText('Ajouter au bon'));
    if (hasExpiration) {
      expect(saved).not.toHaveBeenCalled();
      expect(screen.getByText('L’expiration est obligatoire pour ce produit.')).toBeTruthy();
      fireEvent.changeText(screen.getByLabelText('Expiration *'), '2027-10-18');
      fireEvent.press(screen.getByText('Ajouter au bon'));
    }
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({ dateExperation: hasExpiration ? '2027-10-18' : null }),
    );
  },
);
// Jest's VM cannot import the native camera dynamically; keep its async lazy
// boundary while substituting the camera component, as for other native APIs.
jest.mock('react', () => {
  const React = jest.requireActual('react');
  return {
    ...React,
    lazy: (load: () => Promise<unknown>) =>
      React.lazy(() =>
        String(load).includes('StockScannerCamera')
          ? Promise.resolve(jest.requireMock('@/features/catalogue/StockScannerCamera'))
          : load(),
      ),
  };
});
const mockAccess = makeAccess({
  permissions: [
    'stores.view',
    'stores.create',
    'stores.update',
    'stores.delete',
    'customers.view',
    'customers.create',
    'customers.update',
    'entries.view',
    'entries.create',
  ],
});
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useIsFocused: () => true,
}));
jest.mock('@/features/access/useAccess', () => ({
  useAccess: () => ({ data: mockAccess, isPending: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (select: (s: unknown) => unknown) =>
    select({
      session: {
        userId: 'user',
        activeStore: { id: 'encrypted-store', name: 'Magasin actif' },
        supportAccess: mockSupport ? { tenantId: 1 } : undefined,
      },
      setActiveStore: jest.fn(),
    }),
}));
jest.mock('@/features/catalogue/StockDesign', () => ({ useDebounce: (value: string) => value }));
jest.mock('@/features/crm/components/CrmDesign', () => ({ CrmAvatar: () => null }));
jest.mock('@/features/crm/components/CareTags', () => ({ CareTags: () => null }));
jest.mock('@/features/superadmin/AdminUI', () => ({
  currency: (v: unknown) => `${v} DH`,
  date: (v: unknown) => String(v),
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
jest.mock('@/features/catalogue/StockScannerCamera', () => ({
  __esModule: true,
  default: () => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return React.createElement(Text, null, 'Caméra du scanner');
  },
}));
jest.mock('@/features/catalogue/stockApi', () => ({
  stockApi: {
    products: jest.fn(async () => ({
      data: [
        { id: 42, productName: 'Produit test', sku: '001234', buyingPrice: 3, hasExpiration: 0 },
      ],
      last_page: 1,
    })),
    lookup: jest.fn(),
  },
}));
jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  registerApiContext: jest.fn(),
  httpClient: { request: jest.fn() },
}));
jest.mock('@/features/commerce/api', () => {
  const real = jest.requireActual('@/features/commerce/api');
  return {
    ...real,
    commerceApi: {
      list: jest.fn(),
      get: jest.fn(),
      write: jest.fn(),
      references: jest.fn(),
      archiveCustomer: jest.fn(),
    },
  };
});
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});
function setup(Component: typeof StoresScreen) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <Component />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  mockSupport = false;
  jest.clearAllMocks();
  jest.mocked(commerceApi.list).mockImplementation(async (path) => ({
    rows:
      path === '/stores'
        ? [{ id: 2, name: 'Pharmacie Atlas', phone: '0524000000' }]
        : path === '/customerliste'
          ? [
              {
                id: 3,
                FirstName: 'Amine',
                LastName: 'Alami',
                Active: 1,
                Email: 'amine@example.test',
              },
            ]
          : path === '/entrees'
            ? [
                {
                  id: 4,
                  ref: 'ENT-TEST',
                  total: 100,
                  paid: 20,
                  due: 80,
                  provider: 'Fournisseur',
                  date: '2026-10-18',
                },
              ]
            : [],
    lastPage: 1,
    total: 1,
  }));
  jest.mocked(commerceApi.get).mockImplementation(async (path) =>
    path === '/stores-stats'
      ? { current_stores: 1, max_stores: 3, remaining_stores: 2, can_create_more: true }
      : path.startsWith('/stores/')
        ? { id: 2, name: 'Pharmacie Atlas' }
        : {
            Customer: [
              {
                id: 3,
                FirstName: 'Amine',
                LastName: 'Alami',
                Email: 'amine@example.test',
                Active: 1,
              },
            ],
          },
  );
  jest.mocked(commerceApi.references).mockResolvedValue([]);
  jest.mocked(commerceApi.write).mockResolvedValue({ id: 9 });
});
it('opens and saves a store form without sending a forged owner or store id', async () => {
  setup(StoresScreen);
  await screen.findByText('Pharmacie Atlas');
  await waitFor(() => expect(screen.getByText('Ajouter')).toBeTruthy());
  fireEvent.press(screen.getByText('Ajouter'));
  fireEvent.changeText(screen.getByLabelText('Nom du magasin *'), 'Nouvelle pharmacie');
  fireEvent.press(screen.getByText('Créer le magasin'));
  await waitFor(() =>
    expect(commerceApi.write).toHaveBeenCalledWith('post', '/stores', {
      name: 'Nouvelle pharmacie',
      address: '',
      phone: '',
    }),
  );
});
it('keeps forms and write actions out of the assistance list for every module', async () => {
  mockSupport = true;
  const rendered = setup(StoresScreen);
  await screen.findByText('Pharmacie Atlas');
  expect(screen.queryByText('Ajouter')).toBeNull();
  rendered.unmount();
  const clients = setup(CustomersScreen);
  await screen.findByText('Amine Alami');
  expect(screen.queryByText('Nouveau')).toBeNull();
  clients.unmount();
  setup(EntriesScreen);
  await screen.findByText('#ENT-TEST');
  expect(screen.queryByText('Nouvelle entrée')).toBeNull();
  expect(screen.queryByText('Saisie rapide')).toBeNull();
  expect(commerceApi.write).not.toHaveBeenCalled();
});
it('renders customer filters and opens the actual customer detail', async () => {
  setup(CustomersScreen);
  await screen.findByText('Amine Alami');
  fireEvent.press(screen.getByText('Filtres'));
  fireEvent.changeText(screen.getByLabelText('CIN'), 'AA12');
  fireEvent.press(screen.getByText('Appliquer'));
  await waitFor(() =>
    expect(commerceApi.list).toHaveBeenLastCalledWith(
      '/customerliste',
      expect.objectContaining({ cin: 'AA12', page: 1 }),
      expect.anything(),
    ),
  );
  fireEvent.press(await screen.findByText('Amine Alami'));
  await screen.findByText('Informations personnelles');
  expect(screen.getByText('Informations commerciales')).toBeTruthy();
});
it('renders entry financial values and does not send requests for the next page automatically', async () => {
  setup(EntriesScreen);
  await screen.findByText('#ENT-TEST');
  expect(screen.getByText('80 DH')).toBeTruthy();
  expect(screen.getByText('Payé')).toBeTruthy();
  expect(commerceApi.list).toHaveBeenCalledTimes(1);
});
it('completes the three-step stock entry with product quantity and real payment references', async () => {
  const original = jest.mocked(commerceApi.list).getMockImplementation()!;
  jest.mocked(commerceApi.list).mockImplementation(async (path, params, signal) => {
    const rows =
      path === '/providerDropdown'
        ? [{ id: 8, name: 'Fournisseur test' }]
        : path === '/statuses'
          ? [
              {
                id: params.src === 'entrees' ? 9 : 11,
                label: params.src === 'entrees' ? 'Réceptionnée' : 'Impayée',
              },
            ]
          : path === '/types/payments'
            ? [{ id: 4, label: 'Espèces' }]
            : undefined;
    return rows ? { rows, lastPage: 1, total: 1 } : original(path, params, signal);
  });
  const saved = jest.fn();
  setup(() => <EntryForm data={null} onClose={jest.fn()} onSaved={saved} />);
  fireEvent.press(screen.getByText('Choisir : Fournisseur *'));
  fireEvent.press(await screen.findByText('Fournisseur test'));
  fireEvent.press(screen.getByText('Choisir : Statut de l’entrée *'));
  fireEvent.press(await screen.findByText('Réceptionnée'));
  fireEvent.press(screen.getByText('Suivant'));
  fireEvent.press(screen.getByText('Rechercher un produit'));
  fireEvent.press(await screen.findByText('Produit test · 001234'));
  fireEvent.changeText(screen.getByLabelText('Quantité reçue *'), '2');
  fireEvent.press(screen.getByText('Ajouter au bon'));
  fireEvent.press(screen.getByText('Suivant'));
  expect(await screen.findByText('Espèces')).toBeTruthy();
  fireEvent.press(screen.getByText('Choisir : Statut du paiement *'));
  fireEvent.press(await screen.findByText('Impayée'));
  fireEvent.press(screen.getByText('Enregistrer'));
  await waitFor(() =>
    expect(commerceApi.write).toHaveBeenCalledWith(
      'post',
      '/entrees',
      expect.objectContaining({
        provider_id: 8,
        status: 9,
        paymentType: 4,
        paymentStatus: 11,
        total: 6,
        due: 6,
      }),
    ),
  );
  const sent = jest.mocked(commerceApi.write).mock.calls.at(-1)?.[2];
  expect(JSON.parse(String(sent?.dataItems))[0]).toMatchObject({
    product_id: 42,
    qte: 2,
    ref: '001234',
    price: 3,
  });
  await waitFor(() => expect(saved).toHaveBeenCalledWith('9'));
});
it('preselects Default Provider and complete, sharing picker cache, and keeps the note collapsed', async () => {
  jest.mocked(commerceApi.list).mockImplementation(async (path) => ({
    rows:
      path === '/providerDropdown'
        ? [{ id: 83, name: 'Default Provider' }]
        : [{ id: 91, code: 'complete', label: 'Complete' }],
    lastPage: 1,
    total: 1,
  }));
  setup(() => <EntryForm data={null} onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByText('Default Provider');
  await screen.findByText('Terminée');
  expect(screen.queryByLabelText('Votre note')).toBeNull();
  fireEvent.press(screen.getByText('Note (facultatif)'));
  fireEvent.changeText(screen.getByLabelText('Votre note'), 'Livraison du matin');
  fireEvent.press(screen.getByText('Note (facultatif)'));
  expect(screen.queryByLabelText('Votre note')).toBeNull();
  fireEvent.press(screen.getByText('Note (facultatif)'));
  expect(screen.getByLabelText('Votre note').props.value).toBe('Livraison du matin');
  fireEvent.press(screen.getByText('Suivant'));
  expect(screen.getByText('Rechercher un produit')).toBeTruthy();
  expect(screen.getByText('Scanner un produit')).toBeTruthy();
  fireEvent.press(screen.getByText('Scanner un produit'));
  await screen.findByText('Caméra du scanner');
  expect(screen.getByLabelText('Nom, CIP ou code-barres')).toBeTruthy();
  expect(
    jest.mocked(commerceApi.list).mock.calls.filter(([path]) => path === '/providerDropdown'),
  ).toHaveLength(1);
});
it('defaults to cash and paid and recalculates the paid amount after discounts and tax', async () => {
  jest.mocked(commerceApi.list).mockImplementation(async (path, params) => ({
    rows:
      path === '/providerDropdown'
        ? [{ id: 8, name: 'Default Provider' }]
        : path === '/types/payments'
          ? [{ id: 4, code: 'cash', label: 'Cash' }]
          : params.src === 'payments'
            ? [{ id: 11, code: 'paid', label: 'Paid' }]
            : [{ id: 9, code: 'complete', label: 'Complete' }],
    lastPage: 1,
    total: 1,
  }));
  setup(() => <EntryForm data={null} onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByText('Default Provider');
  fireEvent.press(screen.getByText('Suivant'));
  fireEvent.press(screen.getByText('Rechercher un produit'));
  fireEvent.press(await screen.findByText('Produit test · 001234'));
  fireEvent.changeText(screen.getByLabelText('Quantité reçue *'), '2');
  fireEvent.press(screen.getByText('Ajouter au bon'));
  fireEvent.press(screen.getByText('Suivant'));
  expect(await screen.findByText('Espèces')).toBeTruthy();
  expect(await screen.findByText('Payée')).toBeTruthy();
  expect(screen.getByLabelText('Montant payé (DH)').props.value).toBe('6');
  fireEvent.changeText(screen.getByLabelText('Remise fournisseur (DH)'), '1');
  expect(screen.getByLabelText('Montant payé (DH)').props.value).toBe('5');
  fireEvent.changeText(screen.getByLabelText('Taxe (%)'), '20');
  expect(screen.getByLabelText('Montant payé (DH)').props.value).toBe('6');
  fireEvent.press(screen.getByText('Enregistrer'));
  await waitFor(() =>
    expect(commerceApi.write).toHaveBeenCalledWith(
      'post',
      '/entrees',
      expect.objectContaining({ paymentType: 4, paymentStatus: 11, paid: 6, total: 6, due: 0 }),
    ),
  );
});
it('starts the camera directly and keeps manual product search available while scanning', async () => {
  const selected = jest.fn();
  setup(() => <ProductPicker initialScan onClose={jest.fn()} onSelect={selected} />);
  await screen.findByText('Caméra du scanner');
  expect(stockApi.products).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Nom, CIP ou code-barres'), 'Produit');
  await screen.findByText('Produit test · 001234');
  expect(screen.getByText('Caméra du scanner')).toBeTruthy();
  fireEvent.press(screen.getByText('Produit test · 001234'));
  expect(selected).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
});
it('keeps both step controls in one fixed footer outside the scrolling form', () => {
  setup(() => <EntryForm data={null} onClose={jest.fn()} onSaved={jest.fn()} />);
  const footer = screen.getByTestId('commerce-fixed-footer');
  const actions = screen.getByTestId('entry-step-actions');
  expect(StyleSheet.flatten(actions.props.style).flexDirection).toBe('row');
  expect(within(actions).getByText('Précédent')).toBeTruthy();
  expect(within(actions).getByText('Suivant')).toBeTruthy();
  let parent = footer.parent;
  while (parent) {
    expect(parent.type).not.toBe(ScrollView);
    expect(parent.type).not.toBe('RCTScrollView');
    parent = parent.parent;
  }
  expect(screen.getByLabelText('Précédent').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByText('Suivant'));
  expect(
    within(footer).getByText('Renseignez la référence, la date, le fournisseur et le statut.'),
  ).toBeTruthy();
});
