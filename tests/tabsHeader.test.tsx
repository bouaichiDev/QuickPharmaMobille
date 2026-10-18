/* eslint-disable @typescript-eslint/no-require-imports */
import { render } from '@testing-library/react-native';
import TabsLayout from '@/app/(app)/(tabs)/_layout';
let mockShowHeader = false;
let mockSessionState = { status: 'authenticated', session: { role: 'SuperAdmin' } };
jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = ({ screenOptions }: { screenOptions: { header: () => React.ReactNode } }) => {
    React.useState(0);
    return mockShowHeader ? screenOptions.header() : null;
  };
  Tabs.Screen = function MockTabScreen() {
    return null;
  };
  return { Tabs };
});
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (select: (state: unknown) => unknown) => {
    require('react').useState(0);
    return select(mockSessionState);
  },
}));
jest.mock('@/components/ui/AppText', () => ({ useLatinFonts: () => true }));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/features/dashboard/useDashboard', () => ({ useAlertsDashboard: () => ({}) }));
jest.mock('@/features/notifications/useNotifications', () => ({
  useNotificationsList: () => ({}),
}));
jest.mock('@/features/stores/components/StoreHeader', () => ({ StoreHeader: () => null }));
jest.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
it('keeps header hooks isolated when navigation mounts or removes its header', () => {
  const screen = render(<TabsLayout />);
  mockShowHeader = true;
  expect(() => screen.rerender(<TabsLayout />)).not.toThrow();
  mockShowHeader = false;
  expect(() => screen.rerender(<TabsLayout />)).not.toThrow();
});
it('unmounts tabs on a 401 and safely mounts them for the next session', () => {
  mockShowHeader = true;
  const screen = render(<TabsLayout />);
  mockSessionState = { status: 'anonymous', session: { role: '' } };
  expect(() => screen.rerender(<TabsLayout />)).not.toThrow();
  mockSessionState = { status: 'authenticated', session: { role: 'Admin' } };
  expect(() => screen.rerender(<TabsLayout />)).not.toThrow();
  mockSessionState = { status: 'authenticated', session: { role: 'SuperAdmin' } };
  expect(() => screen.rerender(<TabsLayout />)).not.toThrow();
});
