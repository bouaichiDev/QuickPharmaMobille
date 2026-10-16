import { httpClient } from './client';

/** Download protected images through the same authentication/context path as API data. */
export async function loadAuthenticatedImage(path: string, signal?: AbortSignal): Promise<string> {
  const response = await httpClient.get<Blob>('/images', {
    params: { filename: path },
    responseType: 'blob',
    adapter: 'xhr',
    signal,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Unable to read product photo.'));
    reader.onerror = () => reject(new Error('Unable to read product photo.'));
    reader.readAsDataURL(response.data);
  });
}
