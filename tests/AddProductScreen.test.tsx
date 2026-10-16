import { act, fireEvent, render, screen as currentScreen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { AddProductScreen } from '@/features/stores/screens/AddProductScreen';
import { apiPost } from '@/services/api/client';
import { ApiError } from '@/services/api/apiError';
import { ProductBarcodeScanner } from '@/features/stores/components/ProductBarcodeScanner';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/features/access/useAccess', () => ({ useAccess: () => ({ data: undefined }) }));
jest.mock('@/features/crm/modules', () => ({ can: () => true }));
jest.mock('@/features/catalogue/useStock', () => ({ useStockScope: () => 1 }));
jest.mock('@/features/catalogue/stockApi', () => ({ stockApi: { detail: jest.fn() } }));
jest.mock('@/features/catalogue/StockDesign', () => ({ SNote: 'Text' }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined }),
  useMutation: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
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
jest.mock('@/components/ui/SelectionDialog', () => ({
  SelectionDialog: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
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
function expectAlert(title: string, message: unknown) {
  expect(currentScreen.getByText(title)).toBeTruthy();
  expect(currentScreen.getByTestId('alert-message').props.children).toEqual(message);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});

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

test('keeps edit mode values when leaving the screen', () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
  const screen = render(<AddProductScreen />);
  const onBlur = jest.mocked(useFocusEffect).mock.calls[0]![0]()!;
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
  expect(screen.getByLabelText(key('sellingPrice')).props.value).toBe('130.65');
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

test('success dialog returns to the previous screen only after confirmation', async () => {
  const screen = render(<AddProductScreen />);
  fillRequired(screen);
  await save(screen);
  expectAlert(key('saveSuccessTitle'), key('saveSuccessMessage'));
  expect(mockBack).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: key('done') }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(key('saveSuccessTitle'))).toBeNull();
});
