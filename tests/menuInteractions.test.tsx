import { useState } from 'react';
import { Modal, Text, Button } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ServicesMenuSheet } from '@/features/navigation/ServicesMenuSheet';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
jest.mock('@/features/access/useAccess', () => ({
  useAccess: () => ({ data: { role: { code: 'Admin' } }, isLoading: false }),
}));
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (select: (value: unknown) => unknown) =>
    select({ session: { role: 'Admin', activeStore: { name: 'Magasin' }, menus: [] } }),
}));
jest.mock('@/features/crm/components/CrmDesign', () => ({ crmStyles: { row: {}, grow: {} } }));
jest.mock('@/features/crm/modules', () => ({ can: () => false }));
jest.mock('@/features/navigation/backendMenu', () => ({
  backendMenuGroups: () => [
    {
      title: 'Modules',
      items: [
        { label: 'Entrée', href: '/entries', icon: 'inventory' },
        { label: 'Clients', href: '/customers', icon: 'person' },
        { label: 'Commandes', href: '/orders', icon: 'inventory', disabled: true },
      ],
    },
  ],
}));
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tDynamic: (_key: string, fallback: string) => fallback,
  }),
}));

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

it('removes the native overlay when hidden and allows pressing content after reopening', () => {
  const pressed = jest.fn();
  const close = jest.fn();
  const sheet = (visible: boolean) => (
    <BottomSheet visible={visible} title="Menu" onClose={close}>
      <Button title="Ouvrir" onPress={pressed} />
    </BottomSheet>
  );
  const rendered = render(sheet(true));
  fireEvent.press(screen.getByText('Ouvrir'));
  rendered.rerender(sheet(false));
  expect(rendered.UNSAFE_queryByType(Modal)).toBeNull();
  rendered.rerender(sheet(true));
  fireEvent.press(screen.getByText('Ouvrir'));
  expect(pressed).toHaveBeenCalledTimes(2);
  fireEvent.press(screen.getByLabelText('Menu', { includeHiddenElements: true }));
  expect(close).toHaveBeenCalledTimes(1);
});

it('closes the overlay before navigating, prevents duplicate navigation and reopens normally', () => {
  jest.useFakeTimers();
  function Menu() {
    const [visible, setVisible] = useState(true);
    return (
      <>
        <Text onPress={() => setVisible(true)}>Plus</Text>
        <ServicesMenuSheet visible={visible} onClose={() => setVisible(false)} />
      </>
    );
  }
  const rendered = render(<Menu />);
  fireEvent.press(screen.getByLabelText('Entrée'));
  expect(rendered.UNSAFE_queryByType(Modal)).toBeNull();
  expect(router.push).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(20));
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenLastCalledWith('/entries');
  fireEvent.press(screen.getByText('Plus'));
  fireEvent.press(screen.getByLabelText('Commandes'));
  expect(router.push).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByLabelText('Clients'));
  act(() => jest.advanceTimersByTime(20));
  expect(router.push).toHaveBeenCalledTimes(2);
  expect(router.push).toHaveBeenLastCalledWith('/customers');
});
