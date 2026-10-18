import { act, fireEvent, render, screen as currentScreen } from '@testing-library/react-native';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { AddProductScreen } from '@/features/stores/screens/AddProductScreen';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCategories } from '@/features/stores/useCategories';
import { can } from '@/features/crm/modules';
import { ProductPhoto } from '@/features/catalogue/ProductPhoto';
import { ErrorState } from '@/components/feedback/ErrorState';
import { httpClient, apiPost } from '@/services/api/client';
import { ApiError } from '@/services/api/apiError';
import { ProductBarcodeScanner } from '@/features/stores/components/ProductBarcodeScanner';

const mockBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, navigate: mockNavigate, push: jest.fn() }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/features/access/useAccess', () => ({ useAccess: () => ({ data: undefined }) }));
jest.mock('@/features/crm/modules', () => ({ can: jest.fn(() => true) }));
jest.mock('@/features/catalogue/useStock', () => ({ useStockScope: () => 1 }));
jest.mock('@/features/catalogue/stockApi', () => ({ stockApi: { detail: jest.fn() } }));
jest.mock('@/features/catalogue/StockDesign', () => ({ SNote: 'Text' }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: undefined })),
  useMutation: jest.fn(() => ({ isPending: false, mutateAsync: jest.fn() })),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('@/services/api/client', () => ({
  apiPost: jest.fn(),
  apiGet: jest.fn(),
  httpClient: { post: jest.fn() },
}));
jest.mock('@/features/profile/profileApi', () => ({ useProfile: () => ({ data: { id: 42 } }) }));
jest.mock('@/features/settings/settingsApi', () => ({ useCurrency: () => 'MAD' }));
jest.mock('@/features/stores/useCategories', () => ({
  useCategories: jest.fn(() => ({
    data: { pages: [{ data: [{ id: 12, name: 'Test category' }] }] },
  })),
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
jest.mock('@/components/ui/SelectionDialog', () => ({
  SelectionDialog: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));
jest.mock('@/components/feedback/ErrorState', () => ({ ErrorState: () => null }));
jest.mock('@/features/catalogue/ProductPhoto', () => ({ ProductPhoto: () => null }));
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
function expectAlert(title: string, message: unknown) {
  expect(currentScreen.getByText(title)).toBeTruthy();
  expect(currentScreen.getByTestId('alert-message').props.children).toEqual(message);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});

  jest
    .mocked(useMutation)
    .mockImplementation(() => ({ isPending: false, mutateAsync: jest.fn() }) as never);
  jest.mocked(can).mockReturnValue(true);
  jest.mocked(useQuery).mockReturnValue({ data: undefined } as never);
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
      sellingPrice: '156.78',
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
    expectAlert(key('saveSuccessTitle'), key('saveSuccessMessage'));
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
  expectAlert(key('saveErrorTitle'), key('providerRequired'));
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

test('keeps edit mode values when leaving the screen', async () => {
  mockEditing();
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
  const screen = render(<AddProductScreen />);
  const onBlur = jest.mocked(useFocusEffect).mock.calls[0]![0]()!;
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  fireEvent.changeText(screen.getByLabelText(key('name')), 'Existing product');
  act(() => onBlur());
  expect(screen.getByLabelText(key('name')).props.value).toBe('Existing product');
});

type FormScreen = ReturnType<typeof render>;
function fillRequired(screen: FormScreen, status = 'inStock') {
  fireEvent.changeText(screen.getByLabelText(key('name')), 'QA TEST PRODUCT');
  fireEvent.changeText(screen.getByLabelText(key('sku')), '0012345678905');
  fireEvent.press(screen.getByText(key('selectStatus')));
  fireEvent.press(screen.getByText(key(status)));
}
async function save(screen: FormScreen) {
  await act(async () => fireEvent.press(screen.getByText(key('save'))));
}
function photo(uri = 'file:///qa.jpg', fileSize = 1024) {
  return { uri, fileName: 'qa.jpg', mimeType: 'image/jpeg', width: 100, height: 100, fileSize };
}
async function pickPhotos(screen: FormScreen, assets: ImagePicker.ImagePickerAsset[]) {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets });
  fireEvent.press(screen.getByLabelText(key('photoHint')));
  await act(async () => fireEvent.press(screen.getByText(key('choosePhoto'))));
}
function lastBody() {
  return post.mock.calls[post.mock.calls.length - 1]![1] as FormData;
}

describe('exploratory product entry: valid paths and recovery', () => {
  test.each(['name', 'sku'])('rejects whitespace-only %s', async (field) => {
    const screen = render(<AddProductScreen />);
    fillRequired(screen);
    fireEvent.changeText(screen.getByLabelText(key(field)), '   ');
    await save(screen);
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText(key(field === 'name' ? 'nameRequired' : 'skuRequired'))).toBeTruthy();
  });

  test('requires an explicit availability status', async () => {
    const screen = render(<AddProductScreen />);
    fireEvent.changeText(screen.getByLabelText(key('name')), 'QA');
    fireEvent.changeText(screen.getByLabelText(key('sku')), 'QA-001');
    await save(screen);
    expect(post).not.toHaveBeenCalled();
    expectAlert(key('saveErrorTitle'), key('selectStatus'));
  });

  test('creates an inactive, out-of-stock product without optional details or expiry', async () => {
    const screen = render(<AddProductScreen />);
    fillRequired(screen, 'outOfStock');
    fireEvent.press(screen.getByText(key('expiryRequired')));
    fireEvent.press(screen.getByText(key('active')));
    await save(screen);
    const body = lastBody();
    expect(body.get('status')).toBe('9');
    expect(body.get('active')).toBe('0');
    expect(body.get('quantity')).toBe('0');
    expect(body.get('hasExpiration')).toBe('0');
    expect(body.get('requires_prescription')).toBe('0');
    for (const field of [
      'date_expiration',
      'description',
      'categoryId',
      'providerId',
      'precautions',
      'interactions',
      'side_effects',
    ]) {
      expect(body.has(field)).toBe(false);
    }
  });

  test('preserves Arabic, accents, line breaks, and an alphanumeric SKU', async () => {
    const screen = render(<AddProductScreen />);
    fillRequired(screen);
    fireEvent.changeText(screen.getByLabelText(key('name')), '  منتج تجريبي — crème  ');
    fireEvent.changeText(screen.getByLabelText(key('sku')), '  QA-001-A  ');
    fireEvent.changeText(screen.getByLabelText(key('description')), '  Première ligne\nسطر ثان  ');
    await save(screen);
    expect(lastBody().get('productName')).toBe('منتج تجريبي — crème');
    expect(lastBody().get('sku')).toBe('QA-001-A');
    expect(lastBody().get('description')).toBe('Première ligne\nسطر ثان');
  });

  test.each([
    new ApiError({ kind: 'network', message: 'Offline' }),
    new ApiError({
      kind: 'validation',
      message: 'Duplicate SKU',
      fieldErrors: { sku: ['SKU already exists'] },
    }),
    new ApiError({ kind: 'server', message: 'Server failed' }),
  ])('keeps the draft after $kind failure and allows a successful retry', async (error) => {
    post.mockRejectedValueOnce(error);
    const screen = render(<AddProductScreen />);
    fillRequired(screen);
    await save(screen);
    expect(screen.getByLabelText(key('name')).props.value).toBe('QA TEST PRODUCT');
    expect(screen.getByLabelText(key('sku')).props.value).toBe('0012345678905');
    expectAlert(key('saveErrorTitle'), expect.any(String));
    await save(screen);
    expect(post).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(key('name')).props.value).toBe('');
  });

  test('does not clear the draft when the backend returns an invalid success response', async () => {
    post.mockResolvedValueOnce({ success: true, id: null });
    const screen = render(<AddProductScreen />);
    fillRequired(screen);
    await save(screen);
    expect(screen.getByLabelText(key('name')).props.value).toBe('QA TEST PRODUCT');
    expectAlert(key('saveErrorTitle'), expect.any(String));
  });

  test('a scan fills the SKU, closes the scanner, and allows manual correction', () => {
    const screen = render(<AddProductScreen />);
    fireEvent.press(screen.getByText(key('scan')));
    act(() => screen.UNSAFE_getByType(ProductBarcodeScanner).props.onScan('0012345678905'));
    expect(screen.getByLabelText(key('sku')).props.value).toBe('0012345678905');
    expect(screen.UNSAFE_queryByType(ProductBarcodeScanner)).toBeNull();
    fireEvent.changeText(screen.getByLabelText(key('sku')), 'QA-CORRECTED');
    expect(screen.getByLabelText(key('sku')).props.value).toBe('QA-CORRECTED');
  });

  test('canceling scanning preserves the previously typed SKU', () => {
    const screen = render(<AddProductScreen />);
    fireEvent.changeText(screen.getByLabelText(key('sku')), 'QA-OLD');
    fireEvent.press(screen.getByText(key('scan')));
    act(() => screen.UNSAFE_getByType(ProductBarcodeScanner).props.onClose());
    expect(screen.getByLabelText(key('sku')).props.value).toBe('QA-OLD');
  });

  test('canceling the photo picker changes nothing', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValue({ canceled: true, assets: null });
    const screen = render(<AddProductScreen />);
    fireEvent.press(screen.getByLabelText(key('photoHint')));
    await act(async () => fireEvent.press(screen.getByText(key('choosePhoto'))));
    expect(screen.queryAllByLabelText(key('removePhoto'))).toHaveLength(0);
  });

  test('camera permission denial does not launch the photo camera', async () => {
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockResolvedValue({ granted: false } as ImagePicker.CameraPermissionResponse);
    const screen = render(<AddProductScreen />);
    fireEvent.press(screen.getByLabelText(key('photoHint')));
    await act(async () => fireEvent.press(screen.getByText(key('takePhoto'))));
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expectAlert(key('photoPermissionTitle'), key('photoPermissionMessage'));
  });

  test('picker failure shows an error without losing text', async () => {
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockRejectedValueOnce(new Error('Picker unavailable'));
    const screen = render(<AddProductScreen />);
    fillRequired(screen);
    fireEvent.press(screen.getByLabelText(key('photoHint')));
    await act(async () => fireEvent.press(screen.getByText(key('choosePhoto'))));
    expectAlert(key('photoErrorTitle'), key('photoErrorMessage'));
    expect(screen.getByLabelText(key('name')).props.value).toBe('QA TEST PRODUCT');
  });

  test('accepts the 5 MB limit, rejects larger photos, and keeps the accepted ones', async () => {
    const screen = render(<AddProductScreen />);
    await pickPhotos(screen, [
      photo('file:///limit.jpg', 5 * 1024 * 1024),
      photo('file:///large.jpg', 5 * 1024 * 1024 + 1),
    ]);
    expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(1);
    expectAlert(key('photoTooLargeTitle'), key('photoTooLargeMessage'));
  });

  test('reselecting an existing photo does not duplicate it, and removal works', async () => {
    const screen = render(<AddProductScreen />);
    await pickPhotos(screen, [photo()]);
    await pickPhotos(screen, [photo()]);
    expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(1);
    fireEvent.press(screen.getByLabelText(key('removePhoto')));
    expect(screen.queryAllByLabelText(key('removePhoto'))).toHaveLength(0);
  });
});

// These tests reproduce current gaps. A passing audit assertion means the gap
// exists, not that the entered value is valid or the server would accept it.
describe('audit findings: invalid input currently reaches the network boundary', () => {
  test.each([
    ['buyingPrice', '-10', 'buyingPrice'],
    ['buyingPrice', 'abc', 'buyingPrice'],
    ['buyingPrice', '', 'buyingPrice'],
    ['buyingPrice', '1e309', 'buyingPrice'],
    ['quantity', '-5', 'quantity'],
    ['quantity', '1.5', 'quantity'],
    ['quantity', 'abc', 'quantity'],
    ['minimumStock', '-1', 'minQuantity'],
    ['taxRate', '-2', 'tax'],
    ['discount', '150', 'discount'],
    ['margin', 'abc', 'profitMargin'],
  ])('GAP: %s=%s is submitted without validation', async (field, value, payloadField) => {
    const screen = render(<AddProductScreen />);
    fillRequired(screen);
    fireEvent.press(screen.getByText(key('chooseSupplier')));
    fireEvent.press(screen.getByText('Test supplier'));
    fireEvent.changeText(screen.getByLabelText(key(field)), value);
    await save(screen);
    expect(post).toHaveBeenCalledTimes(1);
    expect(lastBody().get(payloadField)).toBe(value);
  });

  test.each(['', '2020-01-01'])(
    'GAP: expiry enabled with date "%s" reaches the API',
    async (date) => {
      const screen = render(<AddProductScreen />);
      fillRequired(screen);
      fireEvent.changeText(screen.getByLabelText(key('expiryDate')), date);
      await save(screen);
      expect(post).toHaveBeenCalledTimes(1);
      expect(lastBody().get('hasExpiration')).toBe('1');
      expect(lastBody().get('date_expiration')).toBe(date || null);
    },
  );

  test('GAP: a photo picker completing after exit restores a discarded photo', async () => {
    let resolvePicker!: (result: ImagePicker.ImagePickerResult) => void;
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReturnValue(
      new Promise((resolve) => {
        resolvePicker = resolve;
      }),
    );
    const screen = render(<AddProductScreen />);
    const onBlur = jest.mocked(useFocusEffect).mock.calls[0]![0]()!;
    fireEvent.press(screen.getByLabelText(key('photoHint')));
    fireEvent.press(screen.getByText(key('choosePhoto')));
    act(() => onBlur());
    await act(async () => resolvePicker({ canceled: false, assets: [photo()] }));
    expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(1);
  });
});

test('turning expiry off excludes a previously entered date', async () => {
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  fireEvent.changeText(screen.getByLabelText(key('expiryDate')), '2028-12-31');
  fireEvent.press(screen.getByText(key('expiryRequired')));
  expect(screen.queryByLabelText(key('expiryDate'))).toBeNull();
  await save(screen);
  expect(lastBody().get('hasExpiration')).toBe('0');
  expect(lastBody().has('date_expiration')).toBe(false);
});

test('a failed save preserves selected photos as well as text', async () => {
  post.mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'Offline' }));
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  await pickPhotos(screen, [photo()]);
  await save(screen);
  expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(1);
  expect(screen.getByLabelText(key('name')).props.value).toBe('QA TEST PRODUCT');
});

test.each([
  ['10.50', '20', '12.60'],
  ['10,50', '20', '12.60'],
  ['0', '0', '0.00'],
])('calculates selling price for cost %s and margin %s', (cost, margin, expected) => {
  const screen = render(<AddProductScreen />);
  fireEvent.changeText(screen.getByLabelText(key('buyingPrice')), cost);
  fireEvent.changeText(screen.getByLabelText(key('margin')), margin);
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe(expected);
});

test('development autofill populates a complete draft without submitting it', () => {
  const screen = render(<AddProductScreen />);
  fireEvent.press(screen.getByText(key('fillTestData')));
  expect(screen.getByLabelText(key('name')).props.value).toMatch(/^QA Test Product \d+$/);
  expect(screen.getByLabelText(key('sku')).props.value).toMatch(/^QA-\d+$/);
  expect(screen.getByLabelText(key('buyingPrice')).props.value).toBe('100.50');
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('156.78');
  expect(screen.getByLabelText(key('quantity')).props.value).toBe('24');
  expect(screen.getByText('Test category')).toBeTruthy();
  expect(screen.getByText('Test supplier')).toBeTruthy();
  expect(Date.parse(screen.getByLabelText(key('expiryDate')).props.value)).toBeGreaterThan(
    Date.now(),
  );
  expect(post).not.toHaveBeenCalled();
});

test('development autofill is unavailable while editing an existing product', () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
  const screen = render(<AddProductScreen />);
  expect(screen.queryByText(key('fillTestData'))).toBeNull();
});

test('success dialog returns to products only after confirmation', async () => {
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  await save(screen);
  expectAlert(key('saveSuccessTitle'), key('saveSuccessMessage'));
  expect(mockNavigate).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: key('done') }));
  expect(mockNavigate).toHaveBeenCalledWith('/stock');
  expect(mockBack).not.toHaveBeenCalled();
  expect(screen.queryByText(key('saveSuccessTitle'))).toBeNull();
});

test.each([
  [360, 1, 'row'],
  [393, 1, 'row'],
  [412, 1, 'row'],
  [430, 1, 'row'],
  [320, 1, 'column'],
  [412, 2, 'column'],
] as const)(
  'preserves default product rows or reflows at width %s, text scale %s',
  (width, fontScale, expectedDirection) => {
    const original = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...original, width, height: 915, fontScale } }));
    const screen = render(<AddProductScreen />);
    try {
      const findRow = () =>
        screen.UNSAFE_getAllByType(View).find((node) => {
          const style = StyleSheet.flatten(node.props.style);
          return (
            style?.gap === 8 &&
            style?.flexDirection &&
            node.findAllByProps({ accessibilityLabel: key('buyingPrice') }).length > 0 &&
            node.findAllByProps({ accessibilityLabel: key('taxRate') }).length > 0
          );
        })!;
      expect(StyleSheet.flatten(findRow().props.style).flexDirection).toBe(expectedDirection);
      if (expectedDirection === 'row') {
        const saveButton = screen.getByRole('button', { name: key('save') });
        expect(StyleSheet.flatten(saveButton.props.style).flex).toBe(1.5);
      }
      fireEvent.changeText(screen.getByLabelText(key('name')), 'Preserve my draft');
      act(() => Dimensions.set({ window: { ...original, width: 320, height: 568, fontScale: 1 } }));
      expect(StyleSheet.flatten(findRow().props.style).flexDirection).toBe('column');
      expect(screen.getByLabelText(key('name')).props.value).toBe('Preserve my draft');
    } finally {
      screen.unmount();
      act(() => Dimensions.set({ window: original }));
    }
  },
);

const editProduct = {
  id: 7,
  productName: 'Loaded medicine',
  sku: '007',
  description: 'Description',
  categoryId: 12,
  categoryName: 'Test category',
  providerId: 34,
  buyingPrice: 100,
  sellingPrice: 125,
  profitMargin: 30,
  tax: 20,
  includeTaxInPrice: 1,
  discount: 5,
  quantity: 8,
  originalQuantity: 10,
  minQuantity: 3,
  status: 9,
  hasExpiration: 1,
  date_expiration: '2028-05-01',
  precautions: 'Instructions',
  interactions: 'Interactions',
  side_effects: 'Side effects',
  requires_prescription: 1,
  active: 1,
  images: '["one.jpg",{"name":"two.jpg"}]',
};
function mockEditing(product = editProduct) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
  jest.mocked(useQuery).mockReturnValue({
    data: {
      product,
      lots: [{ quantity: 8, expiry: '2029-01-01' }],
      movements: [],
    },
    refetch: jest.fn(),
  } as never);
}
async function renderEdit() {
  mockEditing();
  const result = render(<AddProductScreen />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  return result;
}
test('loads every edit field, saved margin, price, photos and lot expiry', async () => {
  const screen = await renderEdit();
  for (const [field, value] of Object.entries({
    name: 'Loaded medicine',
    sku: '007',
    description: 'Description',
    buyingPrice: '100',
    taxRate: '20',
    margin: '30',
    sellingPrice: '125.00',
    discount: '5',
    quantity: '8',
    minimumStock: '3',
  }))
    expect(screen.getByLabelText(key(field)).props.value).toBe(value);
  expect(screen.getByText('Test category')).toBeTruthy();
  expect(screen.queryByText('Test supplier')).toBeNull();
  expect(screen.getByText(key('outOfStock'))).toBeTruthy();
  for (const field of ['taxIncluded', 'expiryRequired', 'active']) {
    expect(
      screen.getByRole('checkbox', { name: key(field) }).props.accessibilityState.checked,
    ).toBe(true);
  }
  expect(screen.getByText('2028-05-01')).toBeTruthy();
  expect(screen.getByText('2029-01-01')).toBeTruthy();
  expect(screen.UNSAFE_getAllByType(ProductPhoto)).toHaveLength(2);
  expect(screen.getByLabelText(key('quantity')).props.editable).toBe(false);
});
test('background refresh preserves unsaved edits and removed photos', async () => {
  const screen = await renderEdit();
  fireEvent.changeText(screen.getByLabelText(key('name')), 'Unsaved edit');
  fireEvent.press(screen.getAllByLabelText(key('removePhoto'))[0]!);
  mockEditing({ ...editProduct, productName: 'Server refresh' });
  screen.rerender(<AddProductScreen />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  expect(screen.getByLabelText(key('name')).props.value).toBe('Unsaved edit');
  expect(screen.UNSAFE_getAllByType(ProductPhoto)).toHaveLength(1);
});
test('edit loading hides blank form and failed loading provides retry', () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
  const screen = render(<AddProductScreen />);
  expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  expect(screen.queryByLabelText(key('name'))).toBeNull();
  const refetch = jest.fn();
  jest
    .mocked(useQuery)
    .mockReturnValue({ isError: true, error: new Error('Offline'), refetch } as never);
  screen.rerender(<AddProductScreen />);
  act(() => screen.UNSAFE_getByType(ErrorState).props.onRetry());
  expect(refetch).toHaveBeenCalledTimes(1);
});
test('fetches remaining category pages and resolves a category outside the first page', async () => {
  const fetchNextPage = jest.fn();
  jest.mocked(useCategories).mockReturnValueOnce({
    data: { pages: [{ data: [] }] },
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage,
  } as never);
  const screen = await renderEdit();
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Test category')).toBeTruthy();
});
test('update preserves saved selling price and sends retained images without receipt dates', async () => {
  const screen = await renderEdit();
  fireEvent.press(screen.getAllByLabelText(key('removePhoto'))[0]!);
  const options = jest.mocked(useMutation).mock.calls.at(-1)![0]!;
  jest.mocked(httpClient.post).mockResolvedValue({ data: { success: true } });
  let body: FormData;
  await act(async () => {
    await options.mutationFn!(
      {
        productName: 'Loaded medicine',
        sku: '007',
        status: '9',
        buyingPrice: '100',
        sellingPrice: '125.00',
        profitMargin: '30',
        minQuantity: '3',
        hasExpiration: '1',
        date: '2026-10-16',
        date_expiration: '2028-05-01',
        quantity: '8',
      } as never,
      {} as never,
    );
  });
  body = jest.mocked(httpClient.post).mock.calls[0]![1] as FormData;
  expect(body.get('images')).toBe('two.jpg');
  expect(body.get('sellingPrice')).toBe('125.00');
  expect(body.get('quantity')).toBe('10');
  expect(body.has('date_expiration')).toBe(false);
  expect(body.has('date')).toBe(false);
});

test('changing margin recalculates price after initially preserving saved price', async () => {
  const screen = await renderEdit();
  fireEvent.changeText(screen.getByLabelText(key('margin')), '40');
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('168.00');
});
test('an edit without purchase-price access omits hidden fields from updates', async () => {
  jest.mocked(can).mockReturnValue(false);
  const screen = await renderEdit();
  expect(screen.queryByLabelText(key('buyingPrice'))).toBeNull();
  const options = jest.mocked(useMutation).mock.calls.at(-1)![0]!;
  jest.mocked(httpClient.post).mockResolvedValue({ data: { success: true } });
  await act(async () => {
    await options.mutationFn!(
      {
        productName: 'Loaded medicine',
        sku: '007',
        status: '9',
        buyingPrice: '0',
        sellingPrice: '125',
        profitMargin: '0',
        minQuantity: '0',
        hasExpiration: '0',
      } as never,
      {} as never,
    );
  });
  const body = jest.mocked(httpClient.post).mock.calls[0]![1] as FormData;
  for (const field of [
    'buyingPrice',
    'sellingPrice',
    'profitMargin',
    'minQuantity',
    'hasExpiration',
  ]) {
    expect(body.has(field)).toBe(false);
  }
  expect(body.get('images')).toBe('one.jpg,two.jpg');
});

test('opening Add Product after editing clears the existing product and photos, and can edit it again', async () => {
  const screen = await renderEdit();
  expect(screen.UNSAFE_getAllByType(ProductPhoto)).toHaveLength(2);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(useQuery).mockReturnValue({ data: undefined } as never);
  expect(() => screen.rerender(<AddProductScreen />)).not.toThrow();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  expect(screen.getByLabelText(key('name')).props.value).toBe('');
  expect(screen.getByLabelText(key('sku')).props.value).toBe('');
  expect(screen.queryAllByLabelText(key('removePhoto'))).toHaveLength(0);
  expect(screen.UNSAFE_queryAllByType(ProductPhoto)).toHaveLength(0);
  fillRequired(screen);
  await save(screen);
  expect(lastBody().get('images')).toBe('');
  mockEditing();
  screen.rerender(<AddProductScreen />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  expect(screen.getByLabelText(key('name')).props.value).toBe('Loaded medicine');
  expect(screen.UNSAFE_getAllByType(ProductPhoto)).toHaveLength(2);
});

test.each(['back', 'cancel'])(
  '%s from Add Product returns to products instead of dashboard',
  (action) => {
    const screen = render(<AddProductScreen />);
    fireEvent.press(screen.getByRole('button', { name: key(action) }));
    expect(mockNavigate).toHaveBeenCalledWith('/stock');
    expect(mockBack).not.toHaveBeenCalled();
  },
);
test('back during product loading returns to products', () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
  const screen = render(<AddProductScreen />);
  fireEvent.press(screen.getByRole('button', { name: key('back') }));
  expect(mockNavigate).toHaveBeenCalledWith('/stock');
});
test('Android back returns to products and removes its handler on blur', () => {
  const remove = jest.fn();
  const listen = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
  render(<AddProductScreen />);
  const cleanup = jest.mocked(useFocusEffect).mock.calls[0]![0]()!;
  const handler = listen.mock.calls[0]![1];
  act(() => {
    expect(handler(undefined as never)).toBe(true);
  });
  expect(mockNavigate).toHaveBeenCalledWith('/stock');
  act(() => cleanup());
  expect(remove).toHaveBeenCalledTimes(1);
});

function enableEditSubmission() {
  jest.mocked(useMutation).mockImplementation(
    (options) =>
      ({
        isPending: false,
        mutateAsync: (input: unknown) => options.mutationFn!(input as never, {} as never),
      }) as never,
  );
  jest.mocked(httpClient.post).mockResolvedValue({ data: { success: true } });
}
test('Save edits all form fields, removes old photos, uploads a new photo and preserves stock and creator', async () => {
  enableEditSubmission();
  const screen = await renderEdit();
  const originalPlatform = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  const append = jest.spyOn(FormData.prototype, 'append');
  try {
    for (const [field, value] of Object.entries({
      name: ' Updated medicine ',
      sku: '008',
      description: 'Updated description',
      buyingPrice: '200',
      taxRate: '10',
      margin: '20',
      discount: '2',
      minimumStock: '6',
    }))
      fireEvent.changeText(screen.getByLabelText(key(field)), value);
    fireEvent.press(screen.getByText(key('outOfStock')));
    fireEvent.press(screen.getByText(key('inStock')));
    fireEvent.press(screen.getByText(key('taxIncluded')));
    fireEvent.press(screen.getByText(key('active')));
    fireEvent.press(screen.getAllByLabelText(key('removePhoto'))[0]!);
    await pickPhotos(screen, [photo()]);
    await save(screen);
    expect(httpClient.post).toHaveBeenCalledWith('/product/update', expect.any(FormData));
    expect(post).not.toHaveBeenCalled();
    const body = jest.mocked(httpClient.post).mock.calls[0]![1] as FormData;
    for (const [field, value] of Object.entries({
      id: '7',
      productName: 'Updated medicine',
      sku: '008',
      description: 'Updated description',
      categoryId: '12',
      buyingPrice: '200',
      sellingPrice: '240.00',
      profitMargin: '20',
      tax: '10',
      includeTaxInPrice: 'false',
      discount: '2',
      minQuantity: '6',
      status: '7',
      active: '0',
      quantity: '10',
      images: 'two.jpg',
      hasExpiration: '1',
    }))
      expect(body.get(field)).toBe(value);
    expect(body.has('createdBy')).toBe(false);
    expect(body.has('date_expiration')).toBe(false);
    expect(append).toHaveBeenCalledWith(
      'files[0]',
      expect.objectContaining({ uri: 'file:///qa.jpg' }),
    );
    expectAlert(key('updateSuccessTitle'), key('updateSuccessMessage'));
    expect(screen.queryByText(key('saveSuccessTitle'))).toBeNull();
    expect(screen.getByLabelText(key('name')).props.value).toBe(' Updated medicine ');
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: key('done') }));
    expect(mockNavigate).toHaveBeenCalledWith('/stock');
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  }
});
test('failed edit save retains changed text, existing photos and new photos for retry', async () => {
  enableEditSubmission();
  const screen = await renderEdit();
  const originalPlatform = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  try {
    fireEvent.changeText(screen.getByLabelText(key('name')), 'Retry medicine');
    await pickPhotos(screen, [photo()]);
    jest
      .mocked(httpClient.post)
      .mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'Offline' }));
    await save(screen);
    expect(screen.getByLabelText(key('name')).props.value).toBe('Retry medicine');
    expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(3);
    expect(screen.getByText(key('updateErrorTitle'))).toBeTruthy();
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  }
});
test.each(['name', 'sku'])('edit validates required %s before calling update', async (field) => {
  enableEditSubmission();
  const screen = await renderEdit();
  fireEvent.changeText(screen.getByLabelText(key(field)), '   ');
  await save(screen);
  expect(httpClient.post).not.toHaveBeenCalled();
  expect(screen.getByText(key(field === 'name' ? 'nameRequired' : 'skuRequired'))).toBeTruthy();
});

test.each(['back', 'cancel', 'android'])(
  '%s discards unsaved edit text, price and photo changes for the same product',
  async (action) => {
    const listen = jest.spyOn(BackHandler, 'addEventListener');
    const screen = await renderEdit();
    const cleanup = jest.mocked(useFocusEffect).mock.calls[0]![0]()!;
    fireEvent.changeText(screen.getByLabelText(key('name')), 'Discard this name');
    fireEvent.changeText(screen.getByLabelText(key('margin')), '90');
    fireEvent.press(screen.getAllByLabelText(key('removePhoto'))[0]!);
    await pickPhotos(screen, [photo()]);
    if (action === 'android') {
      act(() => {
        listen.mock.calls[0]![1](undefined as never);
      });
    } else {
      fireEvent.press(screen.getByRole('button', { name: key(action) }));
    }
    act(() => cleanup());
    expect(mockNavigate).toHaveBeenCalledWith('/stock');
    // Tabs keep the form mounted. The product query can retain exactly the same cached object.
    screen.rerender(<AddProductScreen />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(screen.getByLabelText(key('name')).props.value).toBe('Loaded medicine');
    expect(screen.getByLabelText(key('margin')).props.value).toBe('30');
    expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('125.00');
    expect(
      screen.UNSAFE_getAllByType(ProductPhoto).map((node) => node.props.product.images),
    ).toEqual(['["one.jpg"]', '["two.jpg"]']);
    expect(screen.getAllByLabelText(key('removePhoto'))).toHaveLength(2);
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  },
);

test('Add Product matches web tax calculation and submits the displayed tax-inclusive price', async () => {
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  fireEvent.changeText(screen.getByLabelText(key('buyingPrice')), '100.6');
  fireEvent.changeText(screen.getByLabelText(key('margin')), '31');
  fireEvent.changeText(screen.getByLabelText(key('taxRate')), '25');
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('131.79');
  fireEvent.press(screen.getByText(key('taxIncluded')));
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('164.73');
  fireEvent.press(screen.getByText(key('taxIncluded')));
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('131.79');
  fireEvent.press(screen.getByText(key('taxIncluded')));
  await save(screen);
  expect(lastBody().get('sellingPrice')).toBe('164.73');
  expect(lastBody().get('includeTaxInPrice')).toBe('true');
});
test('Edit Product recalculates on tax checkbox and rate changes and saves the displayed price', async () => {
  enableEditSubmission();
  mockEditing({
    ...editProduct,
    buyingPrice: 100.6,
    sellingPrice: 164.73,
    profitMargin: 31,
    tax: 25,
  });
  const screen = render(<AddProductScreen />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('164.73');
  fireEvent.press(screen.getByText(key('taxIncluded')));
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('131.79');
  fireEvent.press(screen.getByText(key('taxIncluded')));
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('164.73');
  fireEvent.changeText(screen.getByLabelText(key('taxRate')), '10,5');
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('145.62');
  await save(screen);
  const body = jest.mocked(httpClient.post).mock.calls[0]![1] as FormData;
  expect(body.get('sellingPrice')).toBe('145.62');
  expect(body.get('tax')).toBe('10.5');
});

test('discount preview matches web and updates with tax and discount without discounting the saved base price', async () => {
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  fireEvent.changeText(screen.getByLabelText(key('buyingPrice')), '100.50');
  fireEvent.changeText(screen.getByLabelText(key('margin')), '30');
  fireEvent.changeText(screen.getByLabelText(key('taxRate')), '20');
  fireEvent.press(screen.getByText(key('taxIncluded')));
  fireEvent.changeText(screen.getByLabelText(key('discount')), '5');
  expect(screen.getByTestId('discounted-selling-price').props.children.join('')).toBe('MAD 148.94');
  expect(screen.getByText(key('sellingPriceAfterDiscount'))).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText(key('discount')), '100');
  expect(screen.getByTestId('discounted-selling-price').props.children.join('')).toBe('MAD 0.00');
  fireEvent.changeText(screen.getByLabelText(key('discount')), '0');
  expect(screen.getByTestId('discounted-selling-price').props.children.join('')).toBe('MAD 156.78');
  fireEvent.changeText(screen.getByLabelText(key('discount')), '5');
  await save(screen);
  expect(lastBody().get('sellingPrice')).toBe('156.78');
  expect(lastBody().get('discount')).toBe('5');
});
test('edit discount preview uses saved price, accepts decimal commas, and hides invalid discounts', async () => {
  const screen = await renderEdit();
  expect(screen.getByTestId('discounted-selling-price').props.children.join('')).toBe('MAD 118.75');
  fireEvent.changeText(screen.getByLabelText(key('discount')), '10,5');
  expect(screen.getByTestId('discounted-selling-price').props.children.join('')).toBe('MAD 111.88');
  for (const value of ['-1', '101', 'abc']) {
    fireEvent.changeText(screen.getByLabelText(key('discount')), value);
    expect(screen.queryByTestId('discounted-selling-price')).toBeNull();
  }
});

test.each([true, false])(
  'Edit hides supplier and preserves it by omitting providerId (price access: %s)',
  async (priceAccess) => {
    jest.mocked(can).mockReturnValue(priceAccess);
    enableEditSubmission();
    const screen = await renderEdit();
    expect(screen.queryByText(key('supplier'))).toBeNull();
    expect(screen.queryByText('Test supplier')).toBeNull();
    await save(screen);
    const body = jest.mocked(httpClient.post).mock.calls[0]![1] as FormData;
    expect(body.has('providerId')).toBe(false);
  },
);

test.each([0, 1])(
  'hidden medical information is preserved and required prescription=%s is sent on edit',
  async (prescription) => {
    enableEditSubmission();
    mockEditing({ ...editProduct, requires_prescription: prescription });
    const screen = render(<AddProductScreen />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(screen.queryByText(key('medical'))).toBeNull();
    for (const field of ['instructions', 'interactions', 'sideEffects']) {
      expect(screen.queryByLabelText(key(field))).toBeNull();
    }
    expect(screen.queryByRole('checkbox', { name: key('prescription') })).toBeNull();
    await save(screen);
    const body = jest.mocked(httpClient.post).mock.calls[0]![1] as FormData;
    expect(body.get('requires_prescription')).toBe(String(prescription));
    expect(body.get('precautions')).toBe('Instructions');
    expect(body.get('interactions')).toBe('Interactions');
    expect(body.get('side_effects')).toBe('Side effects');
  },
);

test('manual selling price preserves margin and is saved with decimal commas', async () => {
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  fireEvent.changeText(screen.getByLabelText(key('buyingPrice')), '100');
  fireEvent.changeText(screen.getByLabelText(key('taxRate')), '20');
  fireEvent.press(screen.getByText(key('taxIncluded')));
  fireEvent.changeText(screen.getByLabelText(key('margin')), '30');
  fireEvent.changeText(screen.getByLabelText(key('sellingPrice')), '180,00');
  expect(screen.getByLabelText(key('margin')).props.value).toBe('30');
  await save(screen);
  expect(lastBody().get('sellingPrice')).toBe('180.00');
  expect(lastBody().get('profitMargin')).toBe('30');
});

test('editing selling price updates the saved product', async () => {
  enableEditSubmission();
  const screen = await renderEdit();
  const savedMargin = screen.getByLabelText(key('margin')).props.value;
  fireEvent.changeText(screen.getByLabelText(key('sellingPrice')), '200');
  expect(screen.getByLabelText(key('margin')).props.value).toBe(savedMargin);
  await save(screen);
  expect((jest.mocked(httpClient.post).mock.calls[0]![1] as FormData).get('sellingPrice')).toBe(
    '200.00',
  );
});

test.each(['', '-1', 'abc'])('rejects invalid manual selling price %s', async (value) => {
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  fireEvent.changeText(screen.getByLabelText(key('sellingPrice')), value);
  fireEvent.press(screen.getByText(key('save')));
  expect(screen.getByText(key('invalidSellingPrice'))).toBeTruthy();
  expect(post).not.toHaveBeenCalled();
  expect(screen.queryByTestId('discounted-selling-price')).toBeNull();
});
