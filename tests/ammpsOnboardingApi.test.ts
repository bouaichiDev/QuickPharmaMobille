import { apiGet, apiPost } from '@/services/api/client';
import { ammpsOnboardingApi, importRequestKey } from '@/features/catalogue/ammpsOnboardingApi';

jest.mock('@/services/api/client', () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));

it('retrieves eligibility for the selected store from the same endpoint as the web', async () => {
  jest.mocked(apiGet).mockResolvedValue({ data: { visible: true, count: 25 } });
  expect(await ammpsOnboardingApi.offer('encrypted-store')).toEqual({ visible: true, count: 25 });
  expect(apiGet).toHaveBeenCalledWith(
    '/products/ammps-onboarding',
    expect.objectContaining({ params: { store_id: 'encrypted-store' }, timeout: 60000 }),
  );
});

it('submits the server offer and stable UUID without specifying a client-controlled quantity', async () => {
  jest.mocked(apiPost).mockResolvedValue({ data: { created: 25 } });
  const key = importRequestKey();
  expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(await ammpsOnboardingApi.import('encrypted-store', 'offer-token', key)).toEqual({
    created: 25,
  });
  expect(apiPost).toHaveBeenCalledWith(
    '/products/ammps-onboarding',
    {
      store_id: 'encrypted-store',
      offer_token: 'offer-token',
      request_key: key,
    },
    { timeout: 180000 },
  );
});
