import { Platform } from 'react-native';
import { httpClient } from '@/services/api/client';

/** Use the web's authenticated PDF endpoint; never expose the bearer token in a URL. */
export async function openBillingPdf(id: number | string) {
  const response = await httpClient.get<Blob>(`/subscription-billings/${id}/pdf`, {
    skipStoreContext: true,
    responseType: 'blob',
    adapter: 'xhr',
  });
  if (!String(response.headers['content-type']).includes('application/pdf'))
    throw new Error('Le serveur n’a pas renvoyé de PDF.');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(response.data),
      link = document.createElement('a');
    link.href = url;
    link.download = `facture-abonnement-${id}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
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
      throw new Error('Le document reçu n’est pas un PDF valide.');
    const Print = await import('expo-print');
    await Print.printAsync({ uri });
  }
}
