import { cleanup, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PharmacyLogo } from '@/features/stores/components/PharmacyLogo';
import { apiGet } from '@/services/api/client';
import { loadAuthenticatedImage } from '@/services/api/loadAuthenticatedImage';
let mockStore = 'encrypted-store-A';
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (select: (value: unknown) => unknown) =>
    select({ session: { token: 'token', userId: 'actor', activeStore: { id: mockStore } } }),
}));
jest.mock('@/services/api/client', () => ({ apiGet: jest.fn() }));
jest.mock('@/services/api/loadAuthenticatedImage', () => ({ loadAuthenticatedImage: jest.fn() }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
it('loads the active pharmacy logo and isolates the cache when switching stores', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  jest
    .mocked(apiGet)
    .mockResolvedValueOnce([
      { name: 'companyId', value: 3 },
      { name: 'image', value: 'a.png' },
    ])
    .mockResolvedValueOnce([
      { name: 'companyId', value: 9 },
      { name: 'image', value: 'b.png' },
    ]);
  jest
    .mocked(loadAuthenticatedImage)
    .mockResolvedValueOnce('data:image/png;base64,AAAA')
    .mockResolvedValueOnce('data:image/png;base64,BBBB');
  const tree = () => (
    <QueryClientProvider client={client}>
      <PharmacyLogo />
    </QueryClientProvider>
  );
  const rendered = render(tree());
  await waitFor(() =>
    expect(screen.getByLabelText('Logo de la pharmacie').props.source.uri).toBe(
      'data:image/png;base64,AAAA',
    ),
  );
  expect(loadAuthenticatedImage).toHaveBeenCalledWith('Company/3/logo/a.png', expect.anything());
  mockStore = 'encrypted-store-B';
  rendered.rerender(tree());
  expect(screen.queryByLabelText('Logo de la pharmacie')).toBeNull();
  await waitFor(() =>
    expect(screen.getByLabelText('Logo de la pharmacie').props.source.uri).toBe(
      'data:image/png;base64,BBBB',
    ),
  );
  expect(loadAuthenticatedImage).toHaveBeenCalledWith('Company/9/logo/b.png', expect.anything());
  cleanup();
  client.clear();
});
