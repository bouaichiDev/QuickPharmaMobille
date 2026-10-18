import { StockProductCard } from '@/features/catalogue/StockProductCard';
import { ProductInventory } from '@/features/catalogue/ProductInventory';
import { CategoryDetail } from '@/features/stores/screens/CategoryDetail';
import { CategoryEditor } from '@/features/stores/screens/CategoryEditor';
import { categoriesApi } from '@/features/stores/categoriesApi';
/* eslint-disable @typescript-eslint/no-require-imports */
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarcodeFlow } from '@/features/catalogue/BarcodeFlow';
import { InventoryCount } from '@/features/catalogue/InventoryView';
import { TabletStockDetail } from '@/features/catalogue/TabletStockDetail';
import { StockContext } from '@/features/catalogue/StockContext';
import {
  stockApi,
  canAssociateBarcode,
  productCode,
  type StockProduct,
} from '@/features/catalogue/stockApi';
import { makeAccess } from './fixtures/access';
jest.mock('@/features/access/useAccess', () => ({
  useAccess: () => ({ data: { permissions: ['products.view'] } }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo', () => ({ requireOptionalNativeModule: () => null }));
jest.mock('expo-print', () => ({ printAsync: jest.fn(), printToFileAsync: jest.fn() }));
jest.mock('@/features/stores/components/ExpirationDateField', () => ({
  ExpirationDateField: () => null,
}));
jest.mock('@/features/crm/documents', () => ({ printCrmDocument: jest.fn() }));
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
jest.mock('@/components/ui/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/feedback/ErrorState', () => ({
  ErrorState: ({ error }: { error: Error }) => {
    const T = require('react-native').Text;
    return <T>{error.message}</T>;
  },
}));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (f: (s: unknown) => unknown) => f({ session: null }),
}));
const product: StockProduct = {
  id: 7,
  productName: 'Ravintsara 10ml',
  sku: 'AMMPS-0042',
  quantity: 12,
  minQuantity: 5,
  buyingPrice: 30,
  sellingPrice: 65,
  active: 1,
  hasExpiration: 0,
};
function setup(
  api: Partial<typeof stockApi>,
  props: Partial<React.ComponentProps<typeof BarcodeFlow>> = {},
) {
  const linked = jest.fn();
  const q = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const screen = render(
    <QueryClientProvider client={q}>
      <StockContext.Provider
        value={{ api: { ...stockApi, ...api }, scope: 'test', access: makeAccess() }}
      >
        <BarcodeFlow onClose={jest.fn()} onLinked={linked} {...props} />
      </StockContext.Provider>
    </QueryClientProvider>,
  );
  return { ...screen, linked };
}
it('opens the existing product for a known scanned code without creating or linking', async () => {
  const barcode = jest.fn();
  const screen = setup({ lookup: async () => ({ product }), barcode });
  fireEvent.changeText(screen.getByLabelText('Code-barres ou référence'), '4006381333931');
  fireEvent.press(screen.getByLabelText('Rechercher ce code'));
  await waitFor(() => expect(screen.linked).toHaveBeenCalledWith(product));
  expect(barcode).not.toHaveBeenCalled();
});
it('associates an unknown code to the product explicitly selected by the user', async () => {
  const barcode = jest.fn().mockResolvedValue({});
  const screen = setup({
    lookup: async () => ({ product: null }),
    products: async () => ({
      data: [
        product,
        { ...product, id: 8, productName: 'Produit avec EAN', barcode: '3400936184512' },
        { ...product, id: 9, productName: 'Produit sans prï¿½fixe', sku: 'REF-9' },
      ],
      current_page: 1,
      last_page: 1,
      total: 1,
    }),
    barcode,
  });
  fireEvent.changeText(screen.getByLabelText('Code-barres ou référence'), '0012345678905');
  fireEvent.press(screen.getByLabelText('Rechercher ce code'));
  await waitFor(() =>
    expect(screen.getByText('Ce code-barres n’est associé à aucun produit')).toBeTruthy(),
  );
  fireEvent.press(screen.getByLabelText('Rechercher un produit à associer'));
  fireEvent.changeText(screen.getByLabelText('Saisir le nom du produit à associer…'), 'Ravintsara');
  await waitFor(() => expect(screen.getByLabelText('Sélectionner Ravintsara 10ml')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Sélectionner Ravintsara 10ml'));
  fireEvent.press(screen.getByLabelText('Confirmer l’association du code-barres'));
  await waitFor(() => expect(barcode).toHaveBeenCalledWith(7, '0012345678905', false));
  expect(screen.linked).toHaveBeenCalledWith(
    expect.objectContaining({ sku: 'AMMPS-0042', barcode: '0012345678905' }),
  );
});
it('blocks editing when the role lacks update permission', () => {
  const barcode = jest.fn();
  const screen = setup(
    { barcode },
    { target: product, initialCode: '0012345678905', canUpdate: false },
  );
  const button = screen.getByLabelText('Confirmer l’association du code-barres');
  expect(button.props.accessibilityState.disabled).toBe(true);
  fireEvent.press(button);
  expect(barcode).not.toHaveBeenCalled();
});
it('names inventory lines and requires two explicit confirmations before stock validation', async () => {
  const validate = jest.fn().mockResolvedValue({ validated: true });
  const summary = { total: 1, counted: 1, differences: 1, delta: -1, impact: -12 };
  const data = {
    session: {
      id: 42,
      name: 'Rayon test',
      status: 'in_progress',
      created_at: '2025-03-28',
      summary,
    },
    summary,
    lines: {
      data: [
        {
          id: 1,
          product_id: 7,
          productName: 'Vitamine C',
          sku: 'REF-C',
          expected: 3,
          counted: 2,
          reason: 'Recomptage physique',
          hasExpiration: 0,
          buyingPrice: 12,
        },
      ],
      current_page: 1,
      last_page: 1,
      total: 1,
    },
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const screen = render(
    <QueryClientProvider client={client}>
      <StockContext.Provider
        value={{
          api: { ...stockApi, session: async () => data, validate },
          scope: 'inventory-test',
          access: makeAccess(),
        }}
      >
        <InventoryCount id={42} initialSummary canAdjust onClose={jest.fn()} />
      </StockContext.Provider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('Vitamine C')).toBeTruthy());
  expect(screen.getByLabelText('Valider et ajuster').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByLabelText('Valider et ajuster'));
  expect(validate).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Confirmer et ajuster le stock'));
  await waitFor(() => expect(validate).toHaveBeenCalledWith(42));
});
it('requires a reason and two confirmations for a manual stock withdrawal on tablet', async () => {
  const withdraw = jest.fn().mockResolvedValue({ withdrawn: 2 });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const screen = render(
    <QueryClientProvider client={client}>
      <StockContext.Provider
        value={{
          api: {
            ...stockApi,
            detail: async () => ({ product, lots: [], movements: [] }),
            withdraw,
          },
          scope: 'tablet-test',
          access: makeAccess(),
        }}
      >
        <TabletStockDetail
          id={7}
          canEdit
          canPlace
          canWithdraw
          onEdit={jest.fn()}
          onPlace={jest.fn()}
          onBarcode={jest.fn()}
        />
      </StockContext.Provider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByLabelText('Sortie manuelle')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Sortie manuelle'));
  expect(screen.getByLabelText('Vérifier la sortie').props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(screen.getByLabelText('Quantité à retirer'), '2');
  fireEvent.changeText(screen.getByLabelText('Motif de la sortie'), 'Casse');
  fireEvent.press(screen.getByLabelText('Vérifier la sortie'));
  expect(withdraw).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Confirmer la sortie de stock'));
  await waitFor(() => expect(withdraw).toHaveBeenCalledWith(7, 2, 'Casse'));
});

it('recognizes AMMPS placeholders but excludes an already associated EAN', () => {
  expect(canAssociateBarcode({ sku: '3400936184512', barcode: 'AMMPS-12' })).toBe(true);
  expect(productCode({ sku: '3400936184512', barcode: 'AMMPS-12' })).toBe('');
  expect(canAssociateBarcode({ sku: 'AMMPS-12', barcode: '0012345678905' })).toBe(false);
  expect(canAssociateBarcode({ sku: 'REF-12', barcode: null })).toBe(false);
});

it('keeps the category form open on failure and saves its entered fields on retry', async () => {
  const save = jest
    .spyOn(categoriesApi, 'save')
    .mockRejectedValueOnce(new Error('Connexion interrompue'))
    .mockResolvedValueOnce(undefined);
  const onClose = jest.fn();
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false, gcTime: Infinity },
      queries: { gcTime: Infinity },
    },
  });
  const screen = render(
    <QueryClientProvider client={client}>
      <CategoryEditor onClose={onClose} />
    </QueryClientProvider>,
  );
  expect(screen.getByLabelText('Enregistrer').props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(screen.getByLabelText('Nom *'), 'Soins');
  fireEvent.changeText(screen.getByLabelText('Code *'), 'S01');
  fireEvent.changeText(screen.getByLabelText('Description *'), 'Catï¿½gorie de soins');
  fireEvent.press(screen.getByLabelText('Enregistrer'));
  await waitFor(() => expect(screen.getByText('Connexion interrompue')).toBeTruthy());
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Enregistrer'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(save).toHaveBeenLastCalledWith(
    { name: 'Soins', code: 'S01', description: 'Catï¿½gorie de soins', active: true },
    undefined,
  );
  screen.unmount();
  client.clear();
  save.mockRestore();
});

it('shows category products and line statistics and reloads the selected period', async () => {
  const category = {
    id: 4,
    name: 'Soins',
    code: 'S01',
    description: 'Soins',
    active: 1,
    user_id: 1,
    store_id: 1,
    created_at: null,
    updated_at: null,
  };
  const activity = {
    documents: 1,
    units: 2,
    gross_amount: 20,
    recent: [
      {
        id: 5,
        ref: 'SL-05',
        date: '2026-10-15',
        productName: 'Ravintsara 10ml',
        quantity: 2,
        gross_amount: 20,
      },
    ],
  };
  const summary = jest.spyOn(categoriesApi, 'summary').mockResolvedValue({
    category,
    days: 30,
    from: '2026-09-16',
    stock: { references_count: 1, units: 12, low_count: 0 },
    activity: { sales: activity, entries: null, orders: null },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const products = jest
    .fn()
    .mockResolvedValue({ data: [product], total: 1, current_page: 1, last_page: 1 });
  const screen = render(
    <QueryClientProvider client={client}>
      <StockContext.Provider
        value={{ api: { ...stockApi, products }, scope: 'category-test', access: makeAccess() }}
      >
        <CategoryDetail category={category} onClose={jest.fn()} />
      </StockContext.Provider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('Ravintsara 10ml')).toBeTruthy());
  expect(products).toHaveBeenCalledWith({ category_id: 4, page: 1 }, expect.anything());
  fireEvent.press(screen.getByText('Ventes'));
  await waitFor(() => expect(screen.getByText(/SL-05/)).toBeTruthy());
  fireEvent.press(screen.getByText('90 derniers jours'));
  await waitFor(() => expect(summary).toHaveBeenCalledWith(4, 90));
  fireEvent.press(screen.getByText(/^Entr/));
  await waitFor(() => expect(screen.getByText(/^Ces statistiques/)).toBeTruthy());
  screen.unmount();
  client.clear();
  summary.mockRestore();
});

it('shows the original price and the product discount in the stock list', () => {
  const screen = render(
    <StockProductCard
      product={{ ...product, sellingPrice: 100, discount: 5 }}
      onDetail={jest.fn()}
      onBarcode={jest.fn()}
    />,
  );
  expect(screen.getByText('100,00 DH')).toBeTruthy();
  expect(screen.getByText('95,00 DH')).toBeTruthy();
  expect(screen.getByText('Remise : 5 %')).toBeTruthy();
});
it('opens the inventory action for its product without opening the detail card', () => {
  const onInventory = jest.fn();
  const onDetail = jest.fn();
  const stopPropagation = jest.fn();
  const screen = render(
    <StockProductCard
      product={product}
      onInventory={onInventory}
      onDetail={onDetail}
      onBarcode={jest.fn()}
    />,
  );
  fireEvent.press(screen.getByLabelText(`Inventaire de ${product.productName}`), {
    stopPropagation,
  });
  expect(onInventory).toHaveBeenCalledTimes(1);
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(onDetail).not.toHaveBeenCalled();
  screen.rerender(<StockProductCard product={product} onDetail={onDetail} onBarcode={jest.fn()} />);
  expect(
    screen.getByLabelText(`Inventaire de ${product.productName}`).props.accessibilityState.disabled,
  ).toBe(true);
});
it('loads inventory for the selected product and displays its available lots', async () => {
  const detail = jest.fn().mockResolvedValue({
    product,
    lots: [{ quantity: 12, location: 'Rayon A', expiry: '2027-01-01' }],
    movements: [],
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const screen = render(
    <QueryClientProvider client={client}>
      <StockContext.Provider
        value={{ api: { ...stockApi, detail }, scope: 'inventory-test', access: makeAccess() }}
      >
        <ProductInventory product={product} onClose={jest.fn()} onDetail={jest.fn()} />
      </StockContext.Provider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('12 unités')).toBeTruthy());
  fireEvent.press(screen.getByText('Lots & emplacements'));
  expect(detail).toHaveBeenCalledWith(product.id, expect.anything());
  expect(screen.getByText(/Rayon A/)).toBeTruthy();
  screen.unmount();
  client.clear();
});
