import { httpClient } from '@/services/api/client';
import { fetchEntryPdf } from '@/features/commerce/entryPdf';
jest.mock('@/services/api/client', () => ({ httpClient: { get: jest.fn() } }));
it('downloads the exact web receipt as binary through the authenticated API client', async () => {
  const bytes = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 55]);
  jest.mocked(httpClient.get).mockResolvedValue({ data: bytes.buffer });
  const signal = new AbortController().signal;
  expect(await fetchEntryPdf('42', signal)).toEqual(bytes);
  expect(httpClient.get).toHaveBeenCalledWith('/receptions/42/pdf', {
    responseType: 'arraybuffer',
    timeout: 30000,
    signal,
  });
});
it('rejects an API error body instead of printing it as a receipt', async () => {
  jest.mocked(httpClient.get).mockResolvedValue({ data: Uint8Array.from([123, 125]).buffer });
  await expect(fetchEntryPdf('42')).rejects.toThrow('PDF valide');
});
it('rejects invalid document identifiers before making a request', async () => {
  jest.mocked(httpClient.get).mockClear();
  await expect(fetchEntryPdf('../42')).rejects.toThrow('Identifiant');
  expect(httpClient.get).not.toHaveBeenCalled();
});
