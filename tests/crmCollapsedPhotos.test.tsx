import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ClientPhotos } from '@/features/crm/ClientPhotos';
import { apiGet } from '@/services/api/client';

jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/features/crm/ReferencePicker', () => ({ ReferencePicker: () => null }));
jest.mock('@/features/crm/components/CrmDesign', () => ({ CrmPage: () => null, crmStyles: {} }));
jest.mock('@/features/access/useAccess', () => ({
  useAccess: () => ({ data: { permissions: ['services.documents.view'] } }),
}));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: () => ({ token: 'test', activeStore: { id: 'store' } }),
}));
jest.mock('@/services/api/client', () => ({
  registerApiContext: jest.fn(),
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  httpClient: { get: jest.fn(), delete: jest.fn() },
}));
it('keeps each package gallery collapsed and does not fetch its photos until opened', async () => {
  const get = jest.mocked(apiGet).mockResolvedValue({ success: true, data: [] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const screen = render(
    <QueryClientProvider client={client}>
      <ClientPhotos clientId="12" packageId="pack" collapsible />
    </QueryClientProvider>,
  );
  expect(screen.getByText('Afficher les photos avant / après')).toBeTruthy();
  expect(get).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Afficher les photos avant / après'));
  await waitFor(() => expect(screen.getByText('Aucune photo enregistrée.')).toBeTruthy());
  expect(get).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledWith('/crm-care/clients/12/photos', {
    params: { customer_service_package_id: 'pack', service_id: undefined, session_id: undefined },
  });
  fireEvent.press(screen.getByText('Masquer les photos'));
  expect(screen.getByText('Afficher les photos avant / après')).toBeTruthy();
  screen.unmount();
  client.clear();
});
