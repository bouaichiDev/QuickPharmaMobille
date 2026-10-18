import * as MailComposer from 'expo-mail-composer';
import type { Row } from './api';

export async function ensureEntryMailAvailable() {
  if (!(await MailComposer.isAvailableAsync()))
    throw new Error('Configurez une application e-mail sur votre téléphone pour envoyer le bon.');
}

export async function composeEntryMail(uri: string, entry?: Row) {
  await MailComposer.composeAsync({
    subject: `Bon d’entrée de stock${entry?.ref ? ` - ${entry.ref}` : ''}`,
    body: 'Bonjour,\n\nVeuillez trouver le bon d’entrée de stock en pièce jointe.\n\nCordialement.',
    recipients: entry?.providersEmail ? [String(entry.providersEmail)] : [],
    attachments: [uri],
  });
}
