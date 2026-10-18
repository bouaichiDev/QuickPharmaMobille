import { Platform } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import { File, Paths } from 'expo-file-system';
import { loadSalePdf } from './printSalePdf';

export async function emailSalePdf(id: string, reference: string, recipient?: string) {
  if (Platform.OS === 'web')
    throw new Error('Utilisez l’application mobile pour joindre le PDF directement à un e-mail.');
  if (!(await MailComposer.isAvailableAsync()))
    throw new Error('Configurez Gmail ou une autre application e-mail pour envoyer le PDF.');
  const { uri } = await loadSalePdf(id);
  const name = (reference || id).replace(/[^a-zA-Z0-9_-]/g, '-');
  const file = new File(Paths.cache, `vente-${name}.pdf`);
  file.write(uri.split(',')[1]!, { encoding: 'base64' });
  await MailComposer.composeAsync({
    subject: `Vente - ${reference || id}`,
    body: 'Bonjour,\n\nVeuillez trouver le PDF de votre vente en pièce jointe.\n\nCordialement.',
    recipients: recipient?.trim() ? [recipient.trim()] : [],
    attachments: [file.uri],
  });
  // Keep the cached attachment: Android may read it after composeAsync resolves.
}
