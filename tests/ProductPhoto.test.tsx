import { render, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductPhoto } from '@/features/catalogue/ProductPhoto';
import type { StockProduct } from '@/features/catalogue/stockApi';
import { httpClient } from '@/services/api/client';

jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      session: { token: 'test-token', userId: '23', activeStore: { id: 'encrypted-store' } },
    }),
}));
jest.mock('@/services/api/client', () => ({ httpClient: { get: jest.fn() } }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));

const originalFileReader = globalThis.FileReader;
const readAsDataURL = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(globalThis, 'FileReader', {
    configurable: true,
    writable: true,
    value: class {
      result = 'data:image/jpeg;base64,cGhvdG8=';
      onload?: () => void;
      readAsDataURL(blob: Blob) {
        readAsDataURL(blob);
        this.onload?.();
      }
    },
  });
});
afterEach(() => {
  Object.defineProperty(globalThis, 'FileReader', {
    configurable: true,
    writable: true,
    value: originalFileReader,
  });
});
const product = { id: 12837, images: '["6ad26b607e898.jpg"]' } as StockProduct;
function photo() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductPhoto product={product} />
    </QueryClientProvider>,
  );
}
test('downloads the real product image path via the authenticated client and renders its bytes', async () => {
  jest.mocked(httpClient.get).mockResolvedValue({ data: { type: 'image/jpeg' } });
  const screen = photo();
  await waitFor(() =>
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
      uri: 'data:image/jpeg;base64,cGhvdG8=',
    }),
  );
  expect(httpClient.get).toHaveBeenCalledWith(
    '/images',
    expect.objectContaining({
      params: { filename: 'products/12837/profile/6ad26b607e898.jpg' },
      responseType: 'blob',
      adapter: 'xhr',
      signal: expect.anything(),
    }),
  );
  expect(readAsDataURL).toHaveBeenCalledWith({ type: 'image/jpeg' });
});
test('does not render a broken remote image when the download fails', async () => {
  jest.mocked(httpClient.get).mockRejectedValue(new Error('Not found'));
  const screen = photo();
  await waitFor(() => expect(httpClient.get).toHaveBeenCalledTimes(1));
  expect(screen.UNSAFE_queryByType(Image)).toBeNull();
});
