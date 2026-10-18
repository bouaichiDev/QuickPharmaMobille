import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { responsiveLayout } from '@/components/ui/useResponsiveLayout';

jest.mock('@/components/ui/AppText', () => ({ AppText: 'Text' }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/ui/Logo', () => ({ Logo: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const original = Dimensions.get('window');
function viewport(width: number, height: number, fontScale = 1) {
  act(() => Dimensions.set({ window: { ...original, width, height, fontScale } }));
}
afterEach(() => act(() => Dimensions.set({ window: original })));

test.each([360, 384, 393, 412, 430])(
  'preserves default button and dialog geometry at %s px portrait',
  (width) => {
    viewport(width, 850);
    expect(responsiveLayout({ width, height: 850, fontScale: 1 }).needsReflow).toBe(false);
    const screen = render(
      <ConfirmDialog
        visible
        title="Confirm"
        message="Default message"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
    const card = screen
      .UNSAFE_getAllByType(View)
      .find((node) => node.props.accessibilityRole === 'alert')!;
    const style = StyleSheet.flatten(card.props.style);
    expect(style.padding).toBe(24);
    expect(style.gap).toBe(12);
    expect(style.maxWidth).toBe(420);
    expect(style.maxHeight).toBeUndefined();
    const actions = screen
      .UNSAFE_getAllByType(View)
      .find((node) => StyleSheet.flatten(node.props.style)?.marginTop === 8)!;
    expect(StyleSheet.flatten(actions.props.style).flexDirection).toBe('row');
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBe(48);
    expect(StyleSheet.flatten(button.props.style).paddingVertical).toBeUndefined();
    expect(screen.getByText('Continue').props.numberOfLines).toBe(1);
  },
);

test('keeps the default onboarding arrangement on an A70-sized portrait viewport', () => {
  viewport(412, 915);
  const screen = render(<OnboardingScreen />);
  expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
  const illustration = screen
    .UNSAFE_getAllByType(View)
    .find((node) => StyleSheet.flatten(node.props.style)?.height === 160)!;
  expect(StyleSheet.flatten(illustration.props.style).width).toBe(160);
});

test.each([
  [320, 568, 1],
  [844, 390, 1],
  [412, 915, 2],
])('enables scrolling and wrapping at %sx%s with text scale %s', (width, height, fontScale) => {
  viewport(width!, height!, fontScale!);
  const confirm = jest.fn();
  const screen = render(
    <ConfirmDialog
      visible
      title="Confirm"
      message={'Long message '.repeat(50)}
      confirmLabel="Continue with a long action label"
      cancelLabel="Cancel"
      onConfirm={confirm}
      onCancel={jest.fn()}
    />,
  );
  expect(screen.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
  expect(screen.getByText('Continue with a long action label').props.numberOfLines).toBeUndefined();
  const card = screen
    .UNSAFE_getAllByType(View)
    .find((node) => node.props.accessibilityRole === 'alert')!;
  expect(StyleSheet.flatten(card.props.style).maxHeight).toBe('90%');
  fireEvent.press(screen.getByRole('button', { name: 'Continue with a long action label' }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test('a long message gets a scroll escape only after it exceeds available height', () => {
  viewport(412, 915);
  const screen = render(
    <ConfirmDialog
      visible
      title="Confirm"
      message="Long message"
      confirmLabel="Continue"
      cancelLabel="Cancel"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
    />,
  );
  const card = screen
    .UNSAFE_getAllByType(View)
    .find((node) => node.props.accessibilityRole === 'alert')!;
  fireEvent(card, 'layout', { nativeEvent: { layout: { width: 364, height: 1000, x: 0, y: 0 } } });
  expect(screen.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
});

test('onboarding scrolls in short landscape without changing the selected slide', () => {
  viewport(412, 915);
  const screen = render(<OnboardingScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'mobile.onboarding.next' }));
  viewport(915, 412);
  expect(screen.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
  expect(screen.getByText('mobile.onboarding.slide2Title')).toBeTruthy();
});

test('wrapped buttons keep their action accessible with 200% text', () => {
  viewport(412, 915, 2);
  const press = jest.fn();
  const screen = render(<Button label="Long translated action" onPress={press} />);
  expect(screen.getByText('Long translated action').props.numberOfLines).toBeUndefined();
  expect(
    StyleSheet.flatten(screen.getByText('Long translated action').props.style).flexShrink,
  ).toBe(1);
  fireEvent.press(screen.getByRole('button', { name: 'Long translated action' }));
  expect(press).toHaveBeenCalledTimes(1);
});

test('portrait safe-area edges are unchanged; side protection applies only in landscape', () => {
  viewport(412, 915);
  const screen = render(
    <Screen>
      <View />
    </Screen>,
  );
  const edgeView = () => screen.UNSAFE_getByType(SafeAreaView);
  expect(edgeView().props.edges).toEqual(['top']);
  viewport(915, 412);
  expect(edgeView().props.edges).toEqual(['top', 'left', 'right']);
  viewport(412, 915);
  expect(edgeView().props.edges).toEqual(['top']);
});

test('keeps the default alert footer and moves it into scrolling only for enlarged text', () => {
  viewport(412, 915);
  const screen = render(
    <AlertDialog
      alert={{ title: 'Saved', message: 'Product saved', variant: 'success', actionLabel: 'Done' }}
      onClose={jest.fn()}
    />,
  );
  const insideScroll = () =>
    screen.UNSAFE_getByType(ScrollView).findAllByProps({ accessibilityLabel: 'Done' }).length;
  expect(insideScroll()).toBe(0);
  expect(screen.getByText('Done').props.numberOfLines).toBe(1);
  viewport(412, 915, 2);
  expect(insideScroll()).toBeGreaterThan(0);
  expect(screen.getByText('Done').props.numberOfLines).toBeUndefined();
});

test('a keyboard-reduced portrait height does not activate the landscape layout', () => {
  expect(responsiveLayout({ width: 412, height: 400, fontScale: 1 }).needsReflow).toBe(false);
});
