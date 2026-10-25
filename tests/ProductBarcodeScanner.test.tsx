import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ProductBarcodeScanner } from '@/features/stores/components/ProductBarcodeScanner';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('expo-camera', () => ({
  CameraView: jest.fn(() => null),
  useCameraPermissions: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));
jest.mock('@/components/ui/AppText', () => ({ AppText: 'Text' }));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual('react-native');
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const requestPermission = jest.fn();
const getPermission = jest.fn();
const camera = jest.mocked(CameraView);
function stableFrames(
  scan: NonNullable<React.ComponentProps<typeof CameraView>['onBarcodeScanned']>,
  data: string,
  type = 'code128',
) {
  const clock = jest.spyOn(Date, 'now');
  for (const now of [1000, 1120, 1240]) {
    clock.mockReturnValue(now);
    scan({ data, type } as Parameters<typeof scan>[0]);
  }
  clock.mockRestore();
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: true, canAskAgain: true, status: 'granted', expires: 'never' },
      requestPermission,
      getPermission,
    ] as ReturnType<typeof useCameraPermissions>);
});

test('accepts one barcode and preserves leading zeroes', () => {
  const onScan = jest.fn();
  render(<ProductBarcodeScanner onScan={onScan} onClose={jest.fn()} />);
  const scan = camera.mock.calls[0]![0]!.onBarcodeScanned!;
  act(() => {
    stableFrames(scan, ' 0012345678905 ', 'ean13');
    scan({ data: '9999999999999' } as Parameters<typeof scan>[0]);
  });
  expect(onScan).toHaveBeenCalledTimes(1);
  expect(onScan).toHaveBeenCalledWith('0012345678905');
});

test('cancel leaves the form value untouched and ignores late camera events', () => {
  const onScan = jest.fn();
  const onClose = jest.fn();
  const screen = render(<ProductBarcodeScanner onScan={onScan} onClose={onClose} />);
  const scan = camera.mock.calls[0]![0]!.onBarcodeScanned!;
  fireEvent.press(screen.getByText('mobile.products.form.cancel'));
  act(() => scan({ data: '123456' } as Parameters<typeof scan>[0]));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onScan).not.toHaveBeenCalled();
});

test('requests permission before mounting the camera', async () => {
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' },
      requestPermission,
      getPermission,
    ] as ReturnType<typeof useCameraPermissions>);
  const screen = render(<ProductBarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />);
  expect(camera).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(screen.getByText('mobile.products.form.scanAllow')));
  expect(requestPermission).toHaveBeenCalledTimes(1);
});

afterEach(() => jest.restoreAllMocks());

test('ignores empty camera detections without consuming a later valid scan', () => {
  const onScan = jest.fn();
  render(<ProductBarcodeScanner onScan={onScan} onClose={jest.fn()} />);
  const scan = camera.mock.calls[0]![0]!.onBarcodeScanned!;
  act(() => {
    scan({ data: '   ' } as Parameters<typeof scan>[0]);
    stableFrames(scan, 'QA-001');
  });
  expect(onScan).toHaveBeenCalledTimes(1);
  expect(onScan).toHaveBeenCalledWith('QA-001');
});

test('blocked permission opens settings instead of asking again', async () => {
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: false, canAskAgain: false, status: 'denied', expires: 'never' },
      requestPermission,
      getPermission,
    ] as ReturnType<typeof useCameraPermissions>);
  const screen = render(<ProductBarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />);
  await act(async () => fireEvent.press(screen.getByText('mobile.products.form.scanSettings')));
  expect(settings).toHaveBeenCalledTimes(1);
  expect(requestPermission).not.toHaveBeenCalled();
  expect(camera).not.toHaveBeenCalled();
});

test('camera startup errors leave a cancel action available', () => {
  const onClose = jest.fn();
  const screen = render(<ProductBarcodeScanner onScan={jest.fn()} onClose={onClose} />);
  act(() => camera.mock.calls[0]![0]!.onMountError!({ message: 'Camera unavailable' }));
  expect(screen.getByText('mobile.products.form.scanError')).toBeTruthy();
  fireEvent.press(screen.getByText('mobile.products.form.cancel'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('permission request failure shows an error instead of crashing', async () => {
  requestPermission.mockRejectedValueOnce(new Error('Permission API failed'));
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' },
      requestPermission,
      getPermission,
    ] as ReturnType<typeof useCameraPermissions>);
  const screen = render(<ProductBarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />);
  await act(async () => fireEvent.press(screen.getByText('mobile.products.form.scanAllow')));
  expect(screen.getByText('mobile.products.form.scanError')).toBeTruthy();
});

test('does not activate the camera while the app is backgrounded', () => {
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
  render(<ProductBarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />);
  expect(camera).not.toHaveBeenCalled();
});

test('a reopened scanner accepts a new scan with a fresh duplicate lock', () => {
  const onScan = jest.fn();
  const first = render(<ProductBarcodeScanner onScan={onScan} onClose={jest.fn()} />);
  act(() => stableFrames(camera.mock.calls[0]![0]!.onBarcodeScanned!, 'QA-1'));
  first.unmount();
  camera.mockClear();
  render(<ProductBarcodeScanner onScan={onScan} onClose={jest.fn()} />);
  act(() => stableFrames(camera.mock.calls[0]![0]!.onBarcodeScanned!, 'QA-2'));
  expect(onScan.mock.calls).toEqual([['QA-1'], ['QA-2']]);
});
