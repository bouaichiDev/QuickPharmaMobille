import * as MailComposer from 'expo-mail-composer';
import { composeEntryMail, ensureEntryMailAvailable } from '@/features/commerce/entryMail';
jest.mock('expo-mail-composer', () => ({
  isAvailableAsync: jest.fn(),
  composeAsync: jest.fn(),
}));
beforeEach(() => jest.clearAllMocks());
it('opens the mail composer with the PDF attached and the supplier as recipient', async () => {
  jest.mocked(MailComposer.isAvailableAsync).mockResolvedValue(true);
  await ensureEntryMailAvailable();
  await composeEntryMail('file:///cache/entry.pdf', {
    ref: 'ENT-42',
    providersEmail: 'provider@example.org',
  });
  expect(MailComposer.composeAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: 'Bon d’entrée de stock - ENT-42',
      recipients: ['provider@example.org'],
      attachments: ['file:///cache/entry.pdf'],
    }),
  );
});
it('allows choosing a recipient when the supplier has no email', async () => {
  await composeEntryMail('file:///cache/entry.pdf');
  expect(MailComposer.composeAsync).toHaveBeenCalledWith(
    expect.objectContaining({ recipients: [], attachments: ['file:///cache/entry.pdf'] }),
  );
});
it('reports an unavailable mail app instead of starting PDF generation', async () => {
  jest.mocked(MailComposer.isAvailableAsync).mockResolvedValue(false);
  await expect(ensureEntryMailAvailable()).rejects.toThrow('Configurez une application e-mail');
  expect(MailComposer.composeAsync).not.toHaveBeenCalled();
});
