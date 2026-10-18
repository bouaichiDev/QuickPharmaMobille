import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StoresScreen from '@/features/commerce/StoresScreen';
import CustomersScreen from '@/features/commerce/CustomersScreen';
import EntriesScreen from '@/features/commerce/EntriesScreen';
import EntryForm from '@/features/commerce/EntryForm';
import { commerceApi } from '@/features/commerce/api';
import { makeAccess } from './fixtures/access';
let mockSupport = false;
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
  DateInput: () => null,
}));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
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
  fireEvent.press(screen.getByText('Continuer vers les produits'));
  fireEvent.press(screen.getByText('Rechercher ou scanner un produit'));
  fireEvent.press(await screen.findByText('Produit test · 001234'));
  fireEvent.changeText(screen.getByLabelText('Quantité reçue *'), '2');
  fireEvent.press(screen.getByText('Ajouter au bon'));
  fireEvent.press(screen.getByText('Passer au récapitulatif'));
  fireEvent.press(screen.getByText('Choisir : Mode de paiement *'));
  fireEvent.press(await screen.findByText('Espèces'));
  fireEvent.press(screen.getByText('Choisir : Statut du paiement *'));
  fireEvent.press(await screen.findByText('Impayée'));
  fireEvent.press(screen.getByText('Valider et enregistrer l’entrée'));
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
