import * as MailComposer from 'expo-mail-composer';
import { loadSalePdf } from '@/features/sales/printSalePdf';
import { emailSalePdf } from '@/features/sales/saleMail';
const mockWrite = jest.fn();
jest.mock('expo-mail-composer', () => ({ isAvailableAsync: jest.fn(), composeAsync: jest.fn() }));
jest.mock('@/features/sales/printSalePdf', () => ({ loadSalePdf: jest.fn() }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    uri = 'file:///cache/vente-SL-42.pdf';
    write = mockWrite;
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(MailComposer.isAvailableAsync).mockResolvedValue(true);
  jest
    .mocked(loadSalePdf)
    .mockResolvedValue({ uri: 'data:application/pdf;base64,JVBERi0xLjc=', blob: {} as Blob });
});
it('attaches the existing web sale PDF to a new email addressed to the customer', async () => {
  await emailSalePdf('42', 'SL-42', 'client@example.org');
  expect(loadSalePdf).toHaveBeenCalledWith('42');
  expect(mockWrite).toHaveBeenCalledWith('JVBERi0xLjc=', { encoding: 'base64' });
  expect(MailComposer.composeAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: 'Vente - SL-42',
      recipients: ['client@example.org'],
      attachments: ['file:///cache/vente-SL-42.pdf'],
    }),
  );
});
it('lets the user enter a recipient when the customer has no email', async () => {
  await emailSalePdf('42', 'SL-42');
  expect(MailComposer.composeAsync).toHaveBeenCalledWith(
    expect.objectContaining({ recipients: [], attachments: ['file:///cache/vente-SL-42.pdf'] }),
  );
});
it('reports missing email configuration without downloading a PDF', async () => {
  jest.mocked(MailComposer.isAvailableAsync).mockResolvedValue(false);
  await expect(emailSalePdf('42', 'SL-42')).rejects.toThrow('Configurez Gmail');
  expect(loadSalePdf).not.toHaveBeenCalled();
});
it('does not open an email or save an attachment when PDF generation fails', async () => {
  jest.mocked(loadSalePdf).mockRejectedValue(new Error('PDF indisponible'));
  await expect(emailSalePdf('42', 'SL-42')).rejects.toThrow('PDF indisponible');
  expect(mockWrite).not.toHaveBeenCalled();
  expect(MailComposer.composeAsync).not.toHaveBeenCalled();
});
