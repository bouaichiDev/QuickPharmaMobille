import { printSalePdf, printSaleReceipt } from '../src/features/sales/printSalePdf';
import { httpClient } from '../src/services/api/client';
import * as Print from 'expo-print';
jest.mock('../src/services/api/client', () => ({ httpClient: { get: jest.fn() } }));
jest.mock('expo-print', () => ({
  printAsync: jest.fn().mockResolvedValue(undefined),
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///ticket.pdf' }),
}));
jest.mock('../src/features/crm/documents', () => ({
  escapeHtml: (s: string) => s,
  printCrmDocument: jest.fn(),
}));
jest.mock('../src/features/sales/SalesDesign', () => ({ money: (v: unknown) => String(v) }));
const original = globalThis.FileReader;
let result = 'data:application/pdf;base64,JVBERi0xLjc=';
beforeAll(() => {
  class Reader {
    result: string | null = null;
    onload?: () => void;
    onerror?: () => void;
    readAsDataURL() {
      this.result = result;
      this.onload?.();
    }
  }
  globalThis.FileReader = Reader as unknown as typeof FileReader;
});
afterAll(() => {
  globalThis.FileReader = original;
});
beforeEach(() => {
  jest.clearAllMocks();
  result = 'data:application/pdf;base64,JVBERi0xLjc=';
  jest.mocked(httpClient.get).mockResolvedValue({ data: {} });
});
it('prints the unchanged backend PDF through the authenticated client', async () => {
  await printSalePdf('42', 'SL-42');
  expect(httpClient.get).toHaveBeenCalledWith(
    '/deliveries/42/pdf',
    expect.objectContaining({ responseType: 'blob', headers: { Accept: 'application/json' } }),
  );
  expect(Print.printAsync).toHaveBeenCalledWith({ uri: result });
});
it('rejects JSON/HTML errors instead of printing them as a sale PDF', async () => {
  result = 'data:application/json;base64,eyJlcnJvciI6';
  await expect(printSalePdf('42', 'SL-42')).rejects.toThrow('PDF valide');
  expect(Print.printAsync).not.toHaveBeenCalled();
});
it('does not request a PDF for an unconfirmed sale', async () => {
  await expect(printSalePdf('', '')).rejects.toThrow('enregistrée');
  expect(httpClient.get).not.toHaveBeenCalled();
});
it('requests the same 80 mm paper size as the web ticket', async () => {
  await printSaleReceipt({ sale: { ref: 'SL-42' }, company: {}, items: [] });
  expect(Print.printAsync).toHaveBeenCalledWith({ uri: 'file:///ticket.pdf' });
  expect(Print.printToFileAsync).toHaveBeenCalledWith(
    expect.objectContaining({ width: (80 * 72) / 25.4, height: (297 * 72) / 25.4 }),
  );
});
