import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiPost, httpClient } from '@/services/api/client';
import {
  appendCarePhoto,
  pickCarePhoto,
  uploadCarePhoto,
  loadCarePhoto,
} from '@/features/crm/crmPhotos';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/services/api/client', () => ({ apiPost: jest.fn(), httpClient: { get: jest.fn() } }));
const asset = {
  uri: 'file:///cache/photo.jpg',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  width: 640,
  height: 480,
  fileSize: 1000,
};
beforeEach(() => jest.clearAllMocks());

it('uses the product-style native file descriptor and preserves the session/package associations', async () => {
  const append = jest.spyOn(FormData.prototype, 'append');
  (apiPost as jest.Mock).mockResolvedValue({ success: true, data: { uid: 'photo-1' } });
  await expect(
    uploadCarePhoto(asset, {
      clientId: '12',
      serviceId: 'service',
      sessionId: 'session',
      packageId: 'pack',
      stage: 'after',
      caption: 'Test',
    }),
  ).resolves.toEqual({ uid: 'photo-1' });
  expect(apiPost).toHaveBeenCalledWith('/crm-care/clients/12/photos', expect.any(FormData));
  expect(append).toHaveBeenCalledWith('file', {
    uri: asset.uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  });
  expect(append).toHaveBeenCalledWith('session_id', 'session');
  expect(append).toHaveBeenCalledWith('customer_service_package_id', 'pack');
  append.mockRestore();
});
it('does not open the camera when permission is denied', async () => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await expect(pickCarePhoto('camera')).rejects.toThrow('Autorisez');
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
});
it('opens the camera after permission and accepts its captured image', async () => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [asset],
  });
  await expect(pickCarePhoto('camera')).resolves.toEqual(asset);
  expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
    expect.objectContaining({ allowsEditing: true, mediaTypes: ['images'] }),
  );
});
it('canceling the gallery creates no upload and requires no camera permission', async () => {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: true,
    assets: null,
  });
  await expect(pickCarePhoto('library')).resolves.toBeNull();
  expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(apiPost).not.toHaveBeenCalled();
});
it('rejects files above the backend limit before uploading', async () => {
  const large = { ...asset, fileSize: 5 * 1024 * 1024 + 1 };
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [large],
  });
  await expect(pickCarePhoto('library')).rejects.toThrow('5 Mo');
  expect(() => appendCarePhoto(new FormData(), large)).toThrow('5 Mo');
});
it('uses the actual browser File on web', () => {
  const os = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  const append = jest.spyOn(FormData.prototype, 'append');
  try {
    const file = new Blob(['test'], { type: 'image/png' }) as File;
    appendCarePhoto(new FormData(), { ...asset, file });
    expect(append).toHaveBeenCalledWith('file', file);
  } finally {
    append.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  }
});

it('loads private previews through the authenticated API as binary and returns a displayable URI', async () => {
  const blob = new Blob(['image'], { type: 'image/jpeg' });
  (httpClient.get as jest.Mock).mockResolvedValue({ data: blob });
  const original = globalThis.FileReader;
  const read = jest.fn();
  globalThis.FileReader = class {
    result = 'data:image/jpeg;base64,dGVzdA==';
    onload?: () => void;
    readAsDataURL(blob: Blob) {
      read(blob);
      this.onload?.();
    }
  } as unknown as typeof FileReader;
  try {
    const signal = new AbortController().signal;
    await expect(
      loadCarePhoto('/crm-care/photos/photo-1', { Authorization: 'Bearer test' }, signal),
    ).resolves.toBe('data:image/jpeg;base64,dGVzdA==');
    expect(httpClient.get).toHaveBeenCalledWith('/crm-care/photos/photo-1', {
      headers: { Authorization: 'Bearer test' },
      responseType: 'blob',
      adapter: 'xhr',
      signal,
    });
  } finally {
    globalThis.FileReader = original;
  }
});
