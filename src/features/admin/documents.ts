import { Platform } from 'react-native';
import { httpClient } from '@/services/api/client';
export async function openAdminPdf(path: string, name: string, email = false, recipient?: string) {
  const Mail = email ? await import('expo-mail-composer') : undefined;
  if (email && (Platform.OS === 'web' || !(await Mail!.isAvailableAsync())))
    throw new Error('Configurez Gmail ou une messagerie sur le téléphone pour joindre le PDF.');
  const response = await httpClient.get<ArrayBuffer>(path, {
    responseType: 'arraybuffer',
    timeout: 45000,
  });
  const bytes = new Uint8Array(response.data);
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-')
    throw new Error('Document PDF invalide.');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9-]/gi, '-')}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, `${name.replace(/[^a-z0-9-]/gi, '-')}-${Date.now()}.pdf`);
  file.write(bytes);
  if (email)
    await Mail!.composeAsync({
      subject: name,
      body: 'Bonjour,\n\nVeuillez trouver le document en pièce jointe.\n\nCordialement.',
      recipients: recipient ? [recipient] : [],
      attachments: [file.uri],
    });
  else {
    const Print = await import('expo-print');
    await Print.printAsync({ uri: file.uri });
  }
}
