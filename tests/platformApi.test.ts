import { compact, page, payload, platformApi } from '@/features/superadmin/api';
import { httpClient } from '@/services/api/client';
jest.mock('@/services/api/client', () => ({ httpClient: { get: jest.fn(), request: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it('normalizes raw, enveloped and ResourceCollection pagination without dropping later pages', () => {
  for (const response of [
    { data: [{ id: 3 }], current_page: 2, last_page: 4, total: 76, per_page: 25 },
    {
      success: true,
      data: { data: [{ id: 3 }], meta: { current_page: 2, last_page: 4, total: 76, per_page: 25 } },
    },
    {
      status: true,
      data: { data: [{ id: 3 }], current_page: 2, last_page: 4, total: 76, per_page: 25 },
    },
  ]) {
    expect(page(response)).toMatchObject({
      data: [{ id: 3 }],
      current_page: 2,
      last_page: 4,
      total: 76,
    });
  }
});
it('preserves explicit zero/false filters and rejects successful HTTP failures', () => {
  expect(compact({ active: 0, enabled: false, search: '', state: undefined })).toEqual({
    active: 0,
    enabled: false,
  });
  expect(() => payload({ status: false, message: 'Already paid' })).toThrow('Already paid');
  expect(() => payload({ error: 'Not found' })).toThrow('Not found');
  expect(() => page({ unexpected: true })).toThrow();
});
it('never injects the current store into global requests and forwards cancellation', async () => {
  const controller = new AbortController();
  jest.mocked(httpClient.get).mockResolvedValue({ data: { success: true, data: { count: 1 } } });
  await expect(
    platformApi.get('/superadmin/overview', { search: '' }, controller.signal),
  ).resolves.toEqual({ count: 1 });
  expect(httpClient.get).toHaveBeenCalledWith('/superadmin/overview', {
    skipStoreContext: true,
    signal: controller.signal,
    params: {},
  });
  jest
    .mocked(httpClient.request)
    .mockResolvedValue({ data: { status: false, message: 'Version changed' } });
  await expect(
    platformApi.write('put', '/access-admin/roles/1/permissions', { lock_version: 2 }),
  ).rejects.toThrow('Version changed');
});
