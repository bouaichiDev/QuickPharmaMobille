/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AmmpsOnboardingBanner } from '@/features/catalogue/AmmpsOnboardingBanner';
import { ammpsOnboardingApi, type AmmpsOffer } from '@/features/catalogue/ammpsOnboardingApi';
import { ApiError } from '@/services/api/apiError';

jest.mock('@/features/catalogue/ammpsOnboardingApi', () => ({
  ammpsOnboardingApi: { offer: jest.fn(), import: jest.fn() },
  importRequestKey: jest.fn(() => '12345678-1234-4234-8234-123456789012'),
}));
jest.mock('@/components/ui/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/ui/SelectionDialog', () => ({
  SelectionDialog: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));
jest.mock('@/features/catalogue/StockDesign', () => ({
  SNote: require('react-native').Text,
  SButton: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled: boolean;
  }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'fr-FR',
    tDynamic: (_key: string, fallback: string, params: Record<string, string | number> = {}) =>
      fallback.replace(/\[(\w+)\]/g, (_, key: string) => String(params[key] ?? key)),
  }),
}));
const api = jest.mocked(ammpsOnboardingApi);
const offer: AmmpsOffer = {
  visible: true,
  count: 50,
  remaining: 50,
  unlimited: false,
  offer_token: 'a'.repeat(64),
};
function setup(allowed = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const imported = jest.fn();
  return {
    ...render(
      <QueryClientProvider client={client}>
        <AmmpsOnboardingBanner scope="store-a" allowed={allowed} onImported={imported} />
      </QueryClientProvider>,
    ),
    imported,
    client,
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  api.offer.mockResolvedValue(offer);
  api.import.mockResolvedValue({ created: 50 });
});

it('does not request or show an offer without creation permission', async () => {
  const view = setup(false);
  await waitFor(() => expect(view.queryByText('Importer 50 produits')).toBeNull());
  expect(api.offer).not.toHaveBeenCalled();
});
it('uses server eligibility, including when an existing store must not see the banner', async () => {
  api.offer.mockResolvedValue({ visible: false });
  const view = setup();
  await waitFor(() => expect(api.offer).toHaveBeenCalledWith('store-a', expect.anything()));
  expect(view.queryByText('Importer 50 produits')).toBeNull();
});
it('confirms the exact server quota then refreshes products and permissions', async () => {
  const view = setup();
  fireEvent.press(await view.findByText('Importer 50 produits'));
  expect(
    view.getByText('Votre abonnement autorise encore 50 références. 50 seront importées.'),
  ).toBeTruthy();
  expect(api.import).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('Confirmer l’importation'));
  await waitFor(() => expect(view.imported).toHaveBeenCalledTimes(1));
  expect(api.import).toHaveBeenCalledWith(
    'store-a',
    offer.offer_token,
    '12345678-1234-4234-8234-123456789012',
  );
  expect(await view.findByText('50 médicaments importés.')).toBeTruthy();
  expect(view.queryByText('Importer 50 produits')).toBeNull();
});
it('keeps the same idempotency key when retrying an uncertain timeout', async () => {
  api.import.mockRejectedValueOnce(new ApiError({ kind: 'timeout', message: 'timeout' }));
  const view = setup();
  fireEvent.press(await view.findByText('Importer 50 produits'));
  fireEvent.press(view.getByText('Confirmer l’importation'));
  await view.findByText('L’importation a échoué. Réessayez.');
  fireEvent.press(view.getByText('Confirmer l’importation'));
  await waitFor(() => expect(view.imported).toHaveBeenCalledTimes(1));
  expect(api.import.mock.calls[0]).toEqual(api.import.mock.calls[1]);
});
it('refreshes a changed quota instead of submitting the stale offer again', async () => {
  api.import.mockRejectedValueOnce(
    new ApiError({ kind: 'conflict', status: 409, message: 'offer changed' }),
  );
  const view = setup();
  fireEvent.press(await view.findByText('Importer 50 produits'));
  api.offer.mockResolvedValue({ ...offer, count: 10, remaining: 10, offer_token: 'b'.repeat(64) });
  fireEvent.press(view.getByText('Confirmer l’importation'));
  await view.findByText('Importer 10 produits');
  expect(view.queryByText('Confirmer l’importation')).toBeNull();
  expect(view.imported).not.toHaveBeenCalled();
});
