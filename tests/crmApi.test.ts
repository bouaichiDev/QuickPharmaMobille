jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  httpClient: { request: jest.fn() },
}));
import { listPayload, crmApi } from '@/features/crm/crmApi';
import { apiGet, httpClient } from '@/services/api/client';
import { crmModules } from '@/features/crm/modules';

describe('CRM API contracts', () => {
  it('reads Laravel and CRM pagination without truncating nested histories', () => {
    expect(listPayload({ data: [{ id: 1 }], last_page: 3, total: 45 }).lastPage).toBe(3);
    expect(
      listPayload({
        success: true,
        data: { data: [{ uid: 's1' }], pagination: { last_page: 4, total: 63 } },
      }).total,
    ).toBe(63);
    expect(
      listPayload({
        success: true,
        data: {
          data: { data: [{ id: 1 }], last_page: 2 },
          pagination: { last_page: 2, total: 21 },
        },
      }).rows,
    ).toEqual([{ id: 1 }]);
    expect(() => listPayload({ success: false, message: 'Refus' })).toThrow();
  });
  it('limits payments to CRM sources', async () => {
    jest.mocked(apiGet).mockResolvedValue({ data: [] });
    await crmApi.list(
      crmModules.find((module) => module.key === 'payments')!,
      2,
      'client',
    );
    expect(apiGet).toHaveBeenCalledWith(
      '/payments',
      expect.objectContaining({ params: expect.objectContaining({ src: 'service_crm', page: 2 }) }),
    );
  });
  it('keeps the submission key on session retries', async () => {
    jest
      .mocked(httpClient.request)
      .mockResolvedValue({ data: { success: true, data: { uid: 's1' } } });
    await crmApi.save(
      crmModules.find((module) => module.key === 'sessions')!,
      { price: 10 },
      undefined,
      'submission-key',
    );
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'Idempotency-Key': 'submission-key' },
        method: 'post',
        url: '/service-sessions',
      }),
    );
  });
});
