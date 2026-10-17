/* eslint-disable @typescript-eslint/no-require-imports */
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { StoreAccessGuard } from '@/features/stores/components/StoreAccessGuard';
import { ApiError } from '@/services/api/apiError';

const mockSignOut = jest.fn().mockResolvedValue(undefined);
let mockState: Record<string, unknown>;
let mockAccess: Record<string, unknown>;
jest.mock('@/features/auth/sessionStore', () => ({
  useSessionStore: (select: (state: Record<string, unknown>) => unknown) => select(mockState),
}));
jest.mock('@/features/access/useAccess', () => ({ useAccess: () => mockAccess }));
jest.mock('@/i18n/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@/components/feedback/EmptyState', () => {
  const Text = require('react-native').Text;
  return {
    EmptyState: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});
jest.mock('@/components/ui/Button', () => {
  const Text = require('react-native').Text;
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Text accessibilityRole="button" onPress={onPress}>
        {label}
      </Text>
    ),
  };
});
beforeEach(() => {
  mockSignOut.mockClear();
  mockState = { session: { role: 'SuperAdmin' }, unverified: false, signOut: mockSignOut };
  mockAccess = { isPaused: false, isError: false };
});
it('offers an immediate local exit instead of pending children when offline', () => {
  mockState.unverified = true;
  mockAccess.isPaused = true;
  const screen = render(
    <StoreAccessGuard>
      <Text>Dashboard loading</Text>
    </StoreAccessGuard>,
  );
  expect(screen.queryByText('Dashboard loading')).toBeNull();
  fireEvent.press(screen.getByText('Retour à la connexion'));
  expect(mockSignOut).toHaveBeenCalledWith({ revokeOnServer: false });
});
it('offers an exit for a failed access request without cached rules', () => {
  mockAccess = {
    isError: true,
    error: new ApiError({ kind: 'network', message: 'Network unavailable.' }),
  };
  const screen = render(
    <StoreAccessGuard>
      <Text>Dashboard loading</Text>
    </StoreAccessGuard>,
  );
  expect(screen.getByText('Connexion au serveur impossible')).toBeTruthy();
  expect(screen.getByText('Réessayer')).toBeTruthy();
});
it('preserves usable cached screens after a temporary network error', () => {
  mockAccess = {
    data: { permissions: [] },
    isError: true,
    error: new ApiError({ kind: 'network', message: 'Network unavailable.' }),
  };
  const screen = render(
    <StoreAccessGuard>
      <Text>Cached screen</Text>
    </StoreAccessGuard>,
  );
  expect(screen.getByText('Cached screen')).toBeTruthy();
});
