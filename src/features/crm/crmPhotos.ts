import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { apiPost, httpClient } from '@/services/api/client';
import { unwrap } from './crmApi';

export async function pickCarePhoto(source: 'camera' | 'library') {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error('Autorisez l’appareil photo dans les réglages pour prendre une photo.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...options, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
    throw new Error('La photo dépasse 5 Mo. Choisissez une image plus petite.');
  return asset;
}

/** Same native URI multipart descriptor as the product form. */
export function appendCarePhoto(body: FormData, asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('La photo dépasse 5 Mo.');
  if (Platform.OS === 'web') {
    if (!asset.file) throw new Error('Fichier introuvable.');
    body.append('file', asset.file);
  } else {
    body.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
}

export async function uploadCarePhoto(
  asset: ImagePicker.ImagePickerAsset,
  context: {
    clientId: string;
    serviceId: string;
    sessionId?: string;
    packageId?: string;
    stage: string;
    caption: string;
  },
) {
  const body = new FormData();
  body.append('service_id', context.serviceId);
  body.append('stage', context.stage);
  body.append('caption', context.caption);
  if (context.sessionId) body.append('session_id', context.sessionId);
  if (context.packageId) body.append('customer_service_package_id', context.packageId);
  appendCarePhoto(body, asset);
  return unwrap(
    await apiPost(`/crm-care/clients/${encodeURIComponent(context.clientId)}/photos`, body),
  );
}

export async function loadCarePhoto(
  uri: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
) {
  const response = await httpClient.get<Blob>(uri, {
    headers,
    responseType: 'blob',
    adapter: 'xhr',
    signal,
  });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Photo illisible.'));
    reader.onerror = () => reject(new Error('Photo illisible.'));
    reader.readAsDataURL(response.data);
  });
}
