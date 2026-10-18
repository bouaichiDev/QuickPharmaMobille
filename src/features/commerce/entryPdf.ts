import { Platform } from 'react-native';
import { httpClient } from '@/services/api/client';
import type { Row } from './api';

/** Use the same server-generated receipt as the web, including its logo and footer. */
export async function fetchEntryPdf(id: string, signal?: AbortSignal) {
  if (!/^\d+$/.test(id)) throw new Error('Identifiant du bon invalide.');
  const response = await httpClient.get<ArrayBuffer>(`/receptions/${id}/pdf`, {
    responseType: 'arraybuffer',
    timeout: 30000,
    signal,
  });
  const bytes = new Uint8Array(response.data);
  if (bytes.length < 5 || String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-')
    throw new Error('Le serveur n’a pas renvoyé un PDF valide. Veuillez réessayer.');
  return bytes;
}

export async function openEntryPdf(id: string, entry: Row, print: boolean, signal?: AbortSignal) {
  if (!print && Platform.OS === 'web')
    throw new Error('Utilisez l’application mobile pour joindre le PDF directement à un e-mail.');
  const mail = !print ? await import('./entryMail') : undefined;
  await mail?.ensureEntryMailAvailable();
  const bytes = await fetchEntryPdf(id, signal);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const frame = document.createElement('iframe');
    frame.title = 'Bon de réception';
    frame.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0';
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
    frame.src = url;
    document.body.appendChild(frame);
    setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    }, 60000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const ref = String(entry.ref ?? id).replace(/[^a-zA-Z0-9_-]/g, '-');
  const file = new File(Paths.cache, `reception-${ref}.pdf`);
  file.write(bytes);
  if (print) {
    const Print = await import('expo-print');
    await Print.printAsync({ uri: file.uri });
  } else {
    await mail!.composeEntryMail(file.uri, entry);
  }
  // Mail apps may read the attachment after returning to the app (Android).
  // Keep one cached receipt per reference instead of deleting it prematurely.
}
