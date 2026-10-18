import * as Print from 'expo-print';
import { printCrmDocument } from '@/features/crm/documents';
import { receiptHtml, type ReceiptData } from './SaleDocuments';
import { Platform } from 'react-native';
import { httpClient } from '@/services/api/client';
/** Reuse the exact PDF endpoint used by the web; keep authentication/store/language context. */
export async function loadSalePdf(id: string) {
  if (!id) throw new Error('La vente doit être enregistrée avant de générer son PDF.');
  const response = await httpClient.get<Blob>(`/deliveries/${encodeURIComponent(id)}/pdf`, {
    responseType: 'blob',
    adapter: 'xhr',
    headers: { Accept: 'application/json' },
    timeout: 30000,
  });
  const uri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('PDF illisible.'));
    reader.onerror = () => reject(new Error('PDF illisible.'));
    reader.readAsDataURL(response.data);
  });
  if (!uri.split(',')[1]?.startsWith('JVBERi0'))
    throw new Error('Le serveur n’a pas renvoyé un PDF valide.');
  return { uri, blob: response.data };
}

export async function printSalePdf(id: string, reference: string) {
  const { uri, blob } = await loadSalePdf(id);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delivery-${reference.replace(/[^a-zA-Z0-9-]/g, '-') || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    await Print.printAsync({ uri });
  }
}

export async function printSaleReceipt(data: ReceiptData) {
  const html = receiptHtml(data);
  if (Platform.OS === 'web') await printCrmDocument(html);
  else {
    const { uri } = await Print.printToFileAsync({
      html,
      width: (80 * 72) / 25.4,
      height: (297 * 72) / 25.4,
    });
    await Print.printAsync({ uri });
  }
}
