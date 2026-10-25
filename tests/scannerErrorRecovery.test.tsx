/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BarcodeFlow } from '@/features/catalogue/BarcodeFlow';
import { StockContext } from '@/features/catalogue/StockContext';
import { stockApi } from '@/features/catalogue/stockApi';
import { makeAccess } from './fixtures/access';

const mockCameraMounted = jest.fn();
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  // Jest's VM does not load the production dynamic import; retain the real
  // parent flow and supply only its camera component synchronously.
  lazy: () => require('@/features/catalogue/StockScannerCamera').default,
}));
jest.mock('expo', () => ({ requireOptionalNativeModule: () => ({}) }));
jest.mock('@/features/catalogue/StockScannerCamera', () => ({
  __esModule: true,
  default: function MockCamera({ onRead, paused }: { onRead: (value: string) => void; paused: boolean }) {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    React.useEffect(() => {
      mockCameraMounted();
    }, []);
    // Deliberately emit late native callbacks even when paused: parent must ignore them.
    return (
      <Pressable accessibilityLabel="camera-event" onPress={() => onRead('6118000310624')}>
        <Text>{paused ? 'camera-paused' : 'camera-active'}</Text>
      </Pressable>
    );
  },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-print', () => ({ printAsync: jest.fn(), printToFileAsync: jest.fn() }));
jest.mock('@/features/crm/documents', () => ({ printCrmDocument: jest.fn() }));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (f: (value: unknown) => unknown) => f({ session: null }),
}));
jest.mock('@/components/ui/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/feedback/ErrorState', () => ({
  ErrorState: ({ error }: { error: Error }) => {
    const { Text } = require('react-native');
    return <Text>{error.message}</Text>;
  },
}));
jest.mock('@/features/crm/components/CrmDesign', () => ({
  CrmPage: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => {
    const { View } = require('react-native');
    return (
      <View>
        {children}
        {footer}
      </View>
    );
  },
}));

beforeEach(() => jest.clearAllMocks());
function setup() {
  const lookup = jest
    .fn()
    .mockRejectedValueOnce(new Error('lookup failed'))
    .mockResolvedValue({ product: null });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <StockContext.Provider
        value={{ api: { ...stockApi, lookup }, scope: 'store-a', access: makeAccess() }}
      >
        <BarcodeFlow onClose={jest.fn()} onLinked={jest.fn()} />
      </StockContext.Provider>
    </QueryClientProvider>,
  );
  return { ...view, lookup };
}

it('holds the failed scan without remounting the camera or repeating failed lookups', async () => {
  const view = setup();
  fireEvent.press(await view.findByLabelText('camera-event'));
  await view.findByText('lookup failed');
  expect(view.getByText('camera-paused')).toBeTruthy();
  await act(async () => {
    fireEvent.press(view.getByLabelText('camera-event'));
    fireEvent.press(view.getByLabelText('camera-event'));
  });
  expect(view.lookup).toHaveBeenCalledTimes(1);
  expect(mockCameraMounted).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Code-barres ou référence').props.value).toBe('6118000310624');
  fireEvent.press(view.getByLabelText('Rechercher ce code'));
  await waitFor(() => expect(view.lookup).toHaveBeenCalledTimes(2));
  await view.findByText('Ce code-barres n’est associé à aucun produit');
});

it('only restarts the camera after the user explicitly chooses to rescan', async () => {
  const view = setup();
  fireEvent.press(await view.findByLabelText('camera-event'));
  await view.findByText('lookup failed');
  fireEvent.press(view.getByLabelText('Scanner un autre code'));
  await view.findByText('camera-active');
  expect(mockCameraMounted).toHaveBeenCalledTimes(2);
  expect(view.lookup).toHaveBeenCalledTimes(1);
  expect(view.getByLabelText('Code-barres ou référence').props.value).toBe('');
});
