/* eslint-disable @typescript-eslint/no-require-imports */
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductInventory } from '@/features/catalogue/ProductInventory';
import { StockContext } from '@/features/catalogue/StockContext';
import { stockApi, type StockProduct } from '@/features/catalogue/stockApi';
import { stockActionLabels, type StockUnit } from '@/features/catalogue/productInventoryApi';
import { makeAccess } from './fixtures/access';
jest.mock('@/features/access/useAccess', () => ({ useAccess: () => ({ data: undefined }) }));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (f: (s: unknown) => unknown) => f({ session: null }),
}));
jest.mock('@/components/ui/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/features/crm/components/CrmDesign', () => ({
  CrmPage: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => {
    const V = require('react-native').View;
    return (
      <V>
        {children}
        {footer}
      </V>
    );
  },
}));
jest.mock('@/features/stores/components/ExpirationDateField', () => ({
  ExpirationDateField: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => {
    const Input = require('react-native').TextInput;
    return <Input accessibilityLabel={label} value={value} onChangeText={onChange} />;
  },
}));
jest.mock('@/components/feedback/ErrorState', () => ({
  ErrorState: ({ error }: { error: Error }) => {
    const T = require('react-native').Text;
    return <T>{error.message}</T>;
  },
}));
const product: StockProduct = {
  id: 7,
  productName: 'Produit Démo',
  sku: 'P-7',
  quantity: 2,
  minQuantity: 1,
  buyingPrice: 5,
  sellingPrice: 9,
  active: 1,
  hasExpiration: 0,
};
const unit = (id: number): StockUnit => ({
  id,
  product_id: 7,
  provider_id: null,
  location_id: null,
  expiry: null,
  received_at: '2025-01-01',
  location: null,
  provider: null,
});
function setup(permissions = ['stock.view', 'stock.adjust', 'stock.transfer']) {
  const units = jest
    .fn()
    .mockImplementation(async (_id: number, params: Record<string, unknown>) => ({
      data: params.page === 2 ? [unit(103)] : [unit(101), unit(102)],
      total: 3,
      current_page: Number(params.page),
      last_page: 2,
      per_page: 25,
    }));
  const options = jest
    .fn()
    .mockResolvedValue({
      providers: [{ id: 2, name: 'Fournisseur Démo' }],
      locations: [{ id: 5, name: 'Rayon B' }],
      stores: [{ id: 8, name: 'Autre officine' }],
      destination_products: [
        { id: 201, productName: 'Produit Destination', sku: 'DST-1', hasExpiration: 0 },
      ],
    });
  const movements = jest
    .fn()
    .mockResolvedValue({
      data: [
        {
          id: 3,
          type: 'in',
          source: 'manual',
          quantity: 2,
          created_at: '2025-01-01',
          notes: 'Réception initiale',
          creator: 'Badr',
          from_location: null,
          to_location: 'Rayon B',
        },
      ],
      total: 1,
      current_page: 1,
      last_page: 1,
      per_page: 25,
    });
  const change = jest.fn().mockResolvedValue({ action: 'edit', changed: 1 });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const detail = jest.fn().mockResolvedValue({ product, lots: [], movements: [] });
  const screen = render(
    <QueryClientProvider client={client}>
      <StockContext.Provider
        value={{
          api: { ...stockApi, detail },
          inventoryApi: { units, options, movements, change },
          scope: 'management-test',
          access: makeAccess({ permissions }),
        }}
      >
        <ProductInventory product={product} onClose={jest.fn()} onDetail={jest.fn()} />
      </StockContext.Provider>
    </QueryClientProvider>,
  );
  return {
    screen,
    units,
    options,
    movements,
    change,
    client,
    cleanup: () => {
      screen.unmount();
      client.clear();
    },
  };
}
it('adds stock only after review and retries the exact confirmation after a network failure', async () => {
  const t = setup();
  t.change.mockRejectedValueOnce(new Error('Connexion interrompue'));
  await waitFor(() =>
    expect(t.screen.getByLabelText('Ajouter des unités').props.accessibilityState.disabled).toBe(
      false,
    ),
  );
  fireEvent.press(t.screen.getByLabelText('Ajouter des unités'));
  await waitFor(() =>
    expect(t.screen.getByLabelText('Quantité à ajouter (1 à 1000)')).toBeTruthy(),
  );
  fireEvent.changeText(t.screen.getByLabelText('Quantité à ajouter (1 à 1000)'), '3');
  fireEvent.press(t.screen.getByLabelText('Vérifier'));
  expect(t.change).not.toHaveBeenCalled();
  fireEvent.press(t.screen.getByLabelText('Confirmer'));
  await waitFor(() => expect(t.screen.getByText('Connexion interrompue')).toBeTruthy());
  const first = t.change.mock.calls[0]![1];
  expect(first).toMatchObject({ action: 'add', quantity: 3, confirmed: true, expiry: null });
  expect(first.request_id).toMatch(/^[0-9a-f-]{36}$/);
  fireEvent.press(t.screen.getByLabelText('Confirmer'));
  await waitFor(() => expect(t.screen.getByText('Stock mis à jour.')).toBeTruthy());
  expect(t.change.mock.calls[1]![1]).toEqual(first);
  t.cleanup();
});
it('retains selection across pages and edits dates supplier and location for those units only', async () => {
  const t = setup();
  await waitFor(() => expect(t.screen.getByLabelText('Sélectionner unité 101')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Sélectionner unité 101'));
  fireEvent.press(t.screen.getByLabelText('Suivant'));
  await waitFor(() => expect(t.screen.getByLabelText('Sélectionner unité 103')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Sélectionner unité 103'));
  fireEvent.press(t.screen.getByLabelText('Modifier la sélection'));
  await waitFor(() => expect(t.screen.getByLabelText('Fournisseur : Non renseigné')).toBeTruthy());
  fireEvent.changeText(t.screen.getByLabelText('Date de réception'), '2025-01-02');
  fireEvent.press(t.screen.getByLabelText('Fournisseur : Non renseigné'));
  await waitFor(() => expect(t.screen.getByLabelText('Fournisseur Démo')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Fournisseur Démo'));
  fireEvent.press(t.screen.getByLabelText('Emplacement : Non renseigné'));
  await waitFor(() => expect(t.screen.getByLabelText('Rayon B')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Rayon B'));
  fireEvent.press(t.screen.getByLabelText('Vérifier'));
  fireEvent.press(t.screen.getByLabelText('Confirmer'));
  await waitFor(() =>
    expect(t.change).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        action: 'edit',
        ids: [101, 103],
        provider_id: 2,
        location_id: 5,
        received_at: '2025-01-02',
        expiry: null,
      }),
    ),
  );
  t.cleanup();
});
it.each(['trash', 'delete'] as const)('requires a reason and review before %s', async (action) => {
  const t = setup();
  await waitFor(() => expect(t.screen.getByLabelText('Sélectionner unité 101')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Sélectionner cette page'));
  fireEvent.press(t.screen.getByLabelText(stockActionLabels[action]));
  expect(t.screen.getByLabelText('Vérifier').props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(t.screen.getByLabelText('Motif *'), 'Erreur de saisie');
  fireEvent.press(t.screen.getByLabelText('Vérifier'));
  expect(t.change).not.toHaveBeenCalled();
  fireEvent.press(t.screen.getByLabelText('Confirmer'));
  await waitFor(() =>
    expect(t.change).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ action, ids: [101, 102], reason: 'Erreur de saisie' }),
    ),
  );
  t.cleanup();
});
it('transfers selected units to an explicitly selected destination product', async () => {
  const t = setup();
  await waitFor(() => expect(t.screen.getByLabelText('Sélectionner unité 101')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Sélectionner unité 101'));
  fireEvent.press(t.screen.getByLabelText('Transférer la sélection'));
  await waitFor(() =>
    expect(t.screen.getByLabelText('Établissement : Non renseigné')).toBeTruthy(),
  );
  fireEvent.press(t.screen.getByLabelText('Établissement : Non renseigné'));
  await waitFor(() => expect(t.screen.getByLabelText('Autre officine')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Autre officine'));
  await waitFor(() =>
    expect(t.options).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ destination_store_id: 8 }),
      expect.anything(),
    ),
  );
  fireEvent.press(t.screen.getByLabelText('Produit de destination : Choisir'));
  await waitFor(() => expect(t.screen.getByLabelText('Produit Destination · DST-1')).toBeTruthy());
  fireEvent.press(t.screen.getByLabelText('Produit Destination · DST-1'));
  fireEvent.press(t.screen.getByLabelText('Vérifier'));
  fireEvent.press(t.screen.getByLabelText('Confirmer'));
  await waitFor(() =>
    expect(t.change).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        action: 'transfer',
        ids: [101],
        destination_store_id: 8,
        destination_product_id: 201,
      }),
    ),
  );
  t.cleanup();
});
it('keeps a stock reader read only and loads paginated history on demand', async () => {
  const t = setup(['stock.view']);
  await waitFor(() => expect(t.screen.getByLabelText('Sélectionner unité 101')).toBeTruthy());
  expect(t.screen.queryByLabelText('Ajouter des unités')).toBeNull();
  expect(t.screen.getByLabelText('Sélectionner unité 101').props.accessibilityState.disabled).toBe(
    true,
  );
  expect(t.movements).not.toHaveBeenCalled();
  fireEvent.press(t.screen.getByText('Mouvements'));
  await waitFor(() => expect(t.screen.getByText('Réception initiale')).toBeTruthy());
  expect(t.change).not.toHaveBeenCalled();
  expect(t.options).not.toHaveBeenCalled();
  t.cleanup();
});
