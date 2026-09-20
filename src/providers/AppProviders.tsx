import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bindOnlineManager } from '@/hooks/useNetworkStatus';

import { queryClient } from './queryClient';

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unbindOnline = bindOnlineManager();
    // Refetch stale queries (access rules included) when the app comes back to the foreground.
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
    return () => {
      unbindOnline();
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
