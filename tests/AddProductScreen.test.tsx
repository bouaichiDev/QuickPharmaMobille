import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { AddProductScreen } from '@/features/stores/screens/AddProductScreen';
import { apiPost } from '@/services/api/client';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('@/services/api/client', () => ({ apiPost: jest.fn(), apiGet: jest.fn() }));
jest.mock('@/features/profile/profileApi', () => ({ useProfile: () => ({ data: { id: 42 } }) }));
jest.mock('@/features/settings/settingsApi', () => ({ useCurrency: () => 'MAD' }));
jest.mock('@/features/stores/useCategories', () => ({
  useCategories: () => ({ data: { pages: [{ data: [{ id: 12, name: 'Test category' }] }] } }),
}));
jest.mock('@/features/stores/useProviders', () => ({
  useProviders: () => ({ data: [{ id: 34, name: 'Test supplier' }] }),
}));
jest.mock('@/features/stores/useProducts', () => ({
  useCreateProduct: () => ({
    isPending: false,
    mutateAsync: jest.requireActual('@/features/stores/productsApi').productsApi.create,
  }),
}));
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tDynamic: (key: string) => key,
    locale: 'en-US',
  }),
}));
jest.mock('@/components/ui/AppText', () => ({ AppText: 'Text', useLatinFonts: () => true }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/ui/Screen', () => ({ Screen: 'View' }));
jest.mock('@/components/ui/Card', () => ({ Card: 'View' }));
jest.mock('@/components/ui/BottomSheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));
jest.mock('@/components/feedback/ErrorState', () => ({ ErrorState: () => null }));
jest.mock('@/features/stores/components/ProductBarcodeScanner', () => ({
  ProductBarcodeScanner: () => null,
}));
// Native date picker is a platform boundary; exercise its value callback through an input.
jest.mock('@/features/stores/components/ExpirationDateField', () => ({
  ExpirationDateField: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => {
    const { TextInput } = jest.requireActual('react-native');
    return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />;
  },
}));

jest.setTimeout(30000);

const key = (field: string) => `mobile.products.form.${field}`;
const post = jest.mocked(apiPost);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  post.mockResolvedValue({ success: 'Product created', id: 123 });
});
afterEach(() => jest.restoreAllMocks());

test('submits every product field and two photos as multipart data, then clears the form', async () => {
  const originalPlatform = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  const append = jest.spyOn(FormData.prototype, 'append');
  const photos = [1, 2].map((n) => ({
    uri: `file:///test-product-${n}.jpg`,
    fileName: `test-product-${n}.jpg`,
    mimeType: 'image/jpeg',
    width: 100,
    height: 100,
    fileSize: 1024,
  }));
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue({ canceled: false, assets: photos });
  try {
    const screen = render(<AddProductScreen />);
    const values = {
      name: ' QA TEST PRODUCT ',
      sku: '0012345678905',
      description: ' Test description ',
      buyingPrice: '100,50',
      taxRate: '20',
      margin: '30',
      discount: '5',
      quantity: '24',
      minimumStock: '4',
      expiryDate: '2028-12-31',
      instructions: ' Test instructions ',
      interactions: ' Test interactions ',
      sideEffects: ' Test side effects ',
    };
    for (const [field, value] of Object.entries(values)) {
      fireEvent.changeText(screen.getByLabelText(key(field)), value);
    }
    expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('130.65');
    fireEvent.press(screen.getByText(key('chooseCategory')));
    fireEvent.press(screen.getByText('Test category'));
    fireEvent.press(screen.getByText(key('chooseSupplier')));
    fireEvent.press(screen.getByText('Test supplier'));
    fireEvent.press(screen.getByText(key('selectStatus')));
    fireEvent.press(screen.getByText(key('inStock')));
    fireEvent.press(screen.getByText(key('taxIncluded')));
    fireEvent.press(screen.getByText(key('prescription')));
    fireEvent.press(screen.getByLabelText(key('photoHint')));
    await act(async () => fireEvent.press(screen.getByText(key('choosePhoto'))));
    expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(2);
    await act(async () => fireEvent.press(screen.getByText(key('save'))));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/products/create', expect.any(FormData));
    const body = post.mock.calls[0]![1] as FormData;
    const expected = {
      productName: 'QA TEST PRODUCT',
      sku: '0012345678905',
      description: 'Test description',
      buyingPrice: '100.50',
      tax: '20',
      profitMargin: '30',
      sellingPrice: '130.65',
      discount: '5',
      quantity: '24',
      minQuantity: '4',
      categoryId: '12',
      providerId: '34',
      status: '7',
      hasExpiration: '1',
      date_expiration: '2028-12-31',
      includeTaxInPrice: 'true',
      precautions: 'Test instructions',
      interactions: 'Test interactions',
      side_effects: 'Test side effects',
      requires_prescription: '1',
      active: '1',
      createdBy: '42',
      images: '',
    };
    for (const [field, value] of Object.entries(expected)) expect(body.get(field)).toBe(value);
    expect(Number.isNaN(Date.parse(body.get('date') as string))).toBe(false);
    photos.forEach((photo, index) =>
      expect(append).toHaveBeenCalledWith(`files[${index}]`, {
        uri: photo.uri,
        name: photo.fileName,
        type: photo.mimeType,
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      key('saveSuccessTitle'),
      key('saveSuccessMessage'),
      expect.any(Array),
    );
    expect(screen.getByLabelText(key('name')).props.value).toBe('');
    expect(screen.getByLabelText(key('sku')).props.value).toBe('');
    expect(screen.queryAllByLabelText(key('removePhoto'))).toHaveLength(0);
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  }
});

test('blocks a save when required name and barcode are missing', async () => {
  const screen = render(<AddProductScreen />);
  await act(async () => fireEvent.press(screen.getByText(key('save'))));
  expect(screen.getByText(key('nameRequired'))).toBeTruthy();
  expect(screen.getByText(key('skuRequired'))).toBeTruthy();
  expect(post).not.toHaveBeenCalled();
});

test('requires a supplier for positive initial stock', async () => {
  const screen = render(<AddProductScreen />);
  fireEvent.changeText(screen.getByLabelText(key('name')), 'QA TEST PRODUCT');
  fireEvent.changeText(screen.getByLabelText(key('sku')), '0012345678905');
  fireEvent.changeText(screen.getByLabelText(key('quantity')), '24');
  fireEvent.press(screen.getByText(key('selectStatus')));
  fireEvent.press(screen.getByText(key('inStock')));
  await act(async () => fireEvent.press(screen.getByText(key('save'))));
  expect(Alert.alert).toHaveBeenCalledWith(key('saveErrorTitle'), key('providerRequired'));
  expect(post).not.toHaveBeenCalled();
});

test('clears draft fields, photos, validation, and open sheets when leaving the screen', async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///draft.jpg', width: 100, height: 100 }],
  });
  const screen = render(<AddProductScreen />);
  const onBlur = jest.mocked(useFocusEffect).mock.calls[0]![0]()!;
  fireEvent.changeText(screen.getByLabelText(key('name')), 'Unsaved draft');
  fireEvent.changeText(screen.getByLabelText(key('buyingPrice')), '120');
  fireEvent.press(screen.getByLabelText(key('photoHint')));
  await act(async () => fireEvent.press(screen.getByText(key('choosePhoto'))));
  await act(async () => fireEvent.press(screen.getByText(key('save'))));
  expect(screen.getByText(key('skuRequired'))).toBeTruthy();
  expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(1);
  fireEvent.press(screen.getByText(key('chooseCategory')));
  expect(screen.getByText('Test category')).toBeTruthy();
  act(() => onBlur());
  expect(screen.getByLabelText(key('name')).props.value).toBe('');
  expect(screen.getByLabelText(key('buyingPrice')).props.value).toBe('0.00');
  expect(screen.queryByText(key('skuRequired'))).toBeNull();
  expect(screen.queryByText('Test category')).toBeNull();
  expect(screen.queryAllByLabelText(key('removePhoto'))).toHaveLength(0);
  expect(post).not.toHaveBeenCalled();
});
