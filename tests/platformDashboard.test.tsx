/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { PlatformDashboard } from '@/features/dashboard/components/PlatformDashboard';
import { apiGet } from '@/services/api/client';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('expo-router/react-navigation', () => ({
  NavigationContext: require('react').createContext(undefined),
  NavigationRouteContext: require('react').createContext(undefined),
}));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));

jest.mock('@/services/api/client', () => ({ apiGet: jest.fn(), registerApiContext: jest.fn() }));

it('loads platform endpoints without store context and renders global rather than tenant metrics', async () => {
  const get = jest.mocked(apiGet).mockImplementation(async (url) => ({
    success: true,
    data:
      url === '/superadmin/overview'
        ? {
            tenants: { stores_total: 42, users_total: 113 },
            subscriptions: { active: 7 },
            revenue: { mrr: 1200 },
          }
        : { active_stores_today: 9, new_today: { stores: 2, users: 3, subscriptions: 1 } },
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const screen = render(
    <QueryClientProvider client={client}>
      <PlatformDashboard />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText('42')).toBeTruthy());
  expect(screen.getByText('113')).toBeTruthy();
  expect(screen.getByText('Revenus des abonnements')).toBeTruthy();
  expect(get.mock.calls).toEqual([
    ['/superadmin/overview', { skipStoreContext: true }],
    ['/superadmin/dashboard/snapshot', { skipStoreContext: true }],
  ]);
  screen.unmount();
  client.clear();
});
