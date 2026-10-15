import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
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
    scan({ data: ' 0012345678905 ' } as Parameters<typeof scan>[0]);
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
