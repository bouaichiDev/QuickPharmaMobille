import { Platform } from 'react-native';
import { httpClient } from '@/services/api/client';
import type { Row } from './api';
export async function openOrderDocument(id: string, order: Row, email = false) {
  if (!/^\d+$/.test(id)) throw new Error('Commande invalide.');
  const Mail = email ? await import('expo-mail-composer') : undefined;
  if (email && (Platform.OS === 'web' || !(await Mail!.isAvailableAsync())))
    throw new Error('Utilisez Gmail ou une messagerie configurée sur le téléphone.');
  const response = await httpClient.get<ArrayBuffer>(`/quotes/${id}/pdf`, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  const bytes = new Uint8Array(response.data);
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-')
    throw new Error('Le serveur n’a pas renvoyé un PDF valide.');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `commande-${id}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, `commande-${id}.pdf`);
  file.write(bytes);
  if (email)
    await Mail!.composeAsync({
      subject: `Commande ${order.ref ?? id}`,
      body: 'Bonjour,\n\nVeuillez trouver votre bon de commande en pièce jointe.\n\nCordialement.',
      recipients: order.customersEmail ? [String(order.customersEmail)] : [],
      attachments: [file.uri],
    });
  else {
    const Print = await import('expo-print');
    await Print.printAsync({ uri: file.uri });
  }
}
