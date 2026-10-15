/* eslint-disable @typescript-eslint/no-require-imports */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SalesScreen } from '@/features/sales/SalesScreen';
import { CreditCollection } from '@/features/sales/CreditCollection';
import { apiGet, apiPost } from '@/services/api/client';
import { makeAccess, quota } from './fixtures/access';
const mockAccess = makeAccess({
  permissions: ['sales.create'],
  quotas: { 'sales.monthly': quota({ key: 'sales.monthly' }) },
});
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ action: 'create' }),
}));
jest.mock('@/features/access/useAccess', () => ({ useAccess: () => ({ data: mockAccess }) }));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (fn: (value: unknown) => unknown) =>
    fn({ session: { activeStore: { id: 'store' } } }),
}));
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (s: string) => s, tDynamic: (_s: string, f: string) => f }),
}));
jest.mock('@/components/ui/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('@/components/ui/Card', () => ({ Card: require('react-native').View }));
jest.mock('@/components/ui/Screen', () => ({ Screen: require('react-native').View }));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ label, ...props }: { label: string }) => {
    const R = require('react-native');
    return <R.Button title={label} {...props} />;
  },
}));
jest.mock('@/components/ui/TextField', () => ({
  TextField: ({ label, ...props }: { label: string }) => {
    const R = require('react-native');
    return <R.TextInput accessibilityLabel={label} {...props} />;
  },
}));
jest.mock('@/features/crm/components/CrmDesign', () => ({
  CrmPage: ({
    visible,
    children,
    footer,
  }: {
    visible: boolean;
    children: unknown;
    footer: unknown;
  }) => {
    const R = require('react-native');
    return visible ? (
      <R.View>
        {children}
        {footer}
      </R.View>
    ) : null;
  },
}));
jest.mock('@/features/sales/PosScanner', () => ({ PosScanner: () => null }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/features/crm/ReferencePicker', () => ({
  ReferencePicker: ({
    field,
    onChange,
  }: {
    field: { label: string };
    onChange: (s: string) => void;
  }) => {
    const R = require('react-native');
    return (
      <R.Button
        title={field.label}
        onPress={() => onChange(field.label.startsWith('Client') ? '1' : '7')}
      />
    );
  },
}));
jest.mock('@/features/stores/useProducts', () => ({
  useProducts: () => ({
    data: {
      pages: [
        {
          data: [
            {
              id: 1,
              productName: 'Produit DEMO',
              sku: 'DEMO',
              sellingPrice: 100,
              quantity: 5,
              categoryId: 1,
              minQuantity: 0,
              buyingPrice: 50,
              active: 1,
              hasExpiration: 0,
            },
          ],
        },
      ],
    },
  }),
}));
jest.mock('@/services/api/client', () => ({
  registerApiContext: jest.fn(),
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));
it('submits a partial mobile checkout without displaying unauthorized discount controls', async () => {
  jest.mocked(apiGet).mockImplementation(async (url, options) => {
    if (url === '/customerDropdown')
      return { data: [{ id: 1, FirstName: 'Default', LastName: 'Customer' }] };
    if (url === '/types/payments') return { data: [{ id: 7, code: 'cash', label: 'Espèces' }] };
    if (options?.params?.src === 'sales')
      return { data: [{ id: 2, code: 'complete', label: 'Terminée' }] };
    return {
      data: [
        { id: 10, code: 'paid' },
        { id: 11, code: 'unpaid' },
        { id: 12, code: 'partial' },
      ],
    };
  });
  jest.mocked(apiPost).mockResolvedValue({ success: 'created', id: 42 });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const ui = render(
    <QueryClientProvider client={client}>
      <SalesScreen />
    </QueryClientProvider>,
  );
  fireEvent.press(ui.getByRole('button', { name: 'Ajouter Produit DEMO' }));
  await waitFor(() =>
    expect(
      ui.getByRole('button', { name: 'Voir le panier' }).props.accessibilityState.disabled,
    ).toBe(false),
  );
  fireEvent.press(ui.getByRole('button', { name: 'Voir le panier' }));
  expect(apiPost).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole('button', { name: 'Continuer vers le paiement' }));
  await waitFor(() => expect(ui.getByRole('button', { name: 'Espèces' })).toBeTruthy());
  fireEvent.press(ui.getByRole('button', { name: 'Espèces' }));
  fireEvent.changeText(ui.getByLabelText('Montant reçu'), '40');
  expect(ui.queryByLabelText('Remise (%)')).toBeNull();
  await waitFor(() => expect(ui.getByText('Enregistrer la vente')).toBeTruthy());
  await waitFor(
    () =>
      expect(
        ui.getByRole('button', { name: 'Enregistrer la vente' }).props.accessibilityState?.disabled,
      ).toBe(false),
    { timeout: 10000 },
  );
  fireEvent.press(ui.getByText('Enregistrer la vente'));
  await waitFor(() => expect(apiPost).toHaveBeenCalled());
  expect(apiPost).toHaveBeenCalledWith(
    '/sales',
    expect.objectContaining({ paid: 40, due: 60, total: 100, paymentStatus: 12, discount: 0 }),
    expect.objectContaining({
      headers: { 'Idempotency-Key': expect.stringContaining('mobile-sale-') },
    }),
  );
  await waitFor(() => expect(ui.queryByLabelText('Montant reçu')).toBeNull());
  ui.unmount();
  client.clear();
}, 20000);

it('uses the refreshed customer balance after a partial credit payment, rather than an incorrect summary balance', async () => {
  jest.clearAllMocks();
  let balance = 120;
  jest.mocked(apiGet).mockImplementation(async (url) =>
    url === '/customerDropdown'
      ? { data: [{ id: 1, FirstName: 'Sofia', LastName: 'El Amrani' }] }
      : {
          customer_name: 'Sofia El Amrani',
          total_credit: balance,
          number_of_unpaid_sales: 1,
          credit_details: [{ sale_id: 5, sale_ref: 'SL-5', date: '2026-10-10', credit: balance }],
        },
  );
  jest.mocked(apiPost).mockImplementation(async () => {
    balance = 80;
    return { success: true, payment_summary: { remaining_credit: 0 } };
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const ui = render(
    <QueryClientProvider client={client}>
      <CreditCollection initialCustomer="1" onClose={jest.fn()} onPaid={jest.fn()} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(ui.getAllByText('120,00 DH').length).toBeGreaterThan(0));
  fireEvent.changeText(ui.getByLabelText('Montant à encaisser (DH)'), '40');
  await waitFor(() =>
    expect(
      ui.getByRole('button', { name: 'Confirmer le règlement' }).props.accessibilityState.disabled,
    ).toBe(false),
  );
  fireEvent.press(ui.getByRole('button', { name: 'Confirmer le règlement' }));
  await waitFor(() => expect(ui.getByText('Règlement enregistré avec succès')).toBeTruthy());
  await waitFor(() => expect(ui.getByText('Crédit restant')).toBeTruthy());
  expect(ui.getByText('80,00 DH')).toBeTruthy();
  expect(apiPost).toHaveBeenCalledWith(
    '/credit-payment/pay',
    expect.objectContaining({ customer_id: 1, amount: 40 }),
  );
  ui.unmount();
  client.clear();
});
