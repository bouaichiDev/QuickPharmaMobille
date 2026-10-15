import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useAccess, accessQueryKey } from '@/features/access/useAccess';
import { accessApi } from '@/features/access/accessApi';
import { makeAccess } from './fixtures/access';

jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (selector: (value: unknown) => unknown) =>
    selector({ status: 'authenticated', session: { activeStore: { id: 'store-test' } } }),
}));
jest.mock('@/features/access/accessApi', () => ({ accessApi: { getMe: jest.fn() } }));
jest.mock('@/services/api/client', () => ({ registerApiContext: jest.fn() }));

it('reuses store access on reopening and fetches again only when explicitly invalidated', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const getMe = jest.mocked(accessApi.getMe).mockResolvedValue(makeAccess());
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  const first = renderHook(() => useAccess(), { wrapper });
  await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
  first.unmount();
  const second = renderHook(() => useAccess(), { wrapper });
  await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
  expect(getMe).toHaveBeenCalledTimes(1);
  await client.invalidateQueries({ queryKey: accessQueryKey('store-test') });
  expect(getMe).toHaveBeenCalledTimes(2);
  second.unmount();
  client.clear();
});
