import { useIsFocused } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useContext } from 'react';
import { PlatformContext } from './PlatformContext';
import { useAccess } from '@/features/access/useAccess';
import { platformApi, type Params } from './api';
export function usePlatformGet<T>(path: string, params: Params = {}, enabled = true) {
  const preview = useContext(PlatformContext);
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['platform', preview?.scope ?? 'authenticated', path, params],
    queryFn: ({ signal }) => (preview?.api ?? platformApi).get<T>(path, params, signal),
    enabled: enabled && focused,
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });
}
export function usePlatformList<T>(path: string, params: Params = {}, enabled = true) {
  const preview = useContext(PlatformContext);
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['platform', preview?.scope ?? 'authenticated', path, params],
    queryFn: ({ signal }) => (preview?.api ?? platformApi).list<T>(path, params, signal),
    enabled: enabled && focused,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });
}
export function usePlatformAction(onSuccess?: () => void) {
  const preview = useContext(PlatformContext);
  const cache = useQueryClient();
  const pending = useRef(false);
  const mutation = useMutation({
    mutationFn: async (action: {
      method?: 'post' | 'put' | 'delete';
      path: string;
      body?: unknown;
    }) => (preview?.api ?? platformApi).write(action.method ?? 'post', action.path, action.body),
    retry: false,
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['platform'] });
      onSuccess?.();
    },
  });
  return {
    ...mutation,
    run: async (action: Parameters<typeof mutation.mutateAsync>[0]) => {
      if (pending.current) return;
      pending.current = true;
      try {
        return await mutation.mutateAsync(action);
      } finally {
        pending.current = false;
      }
    },
  };
}
export function usePlatformPermission(permission: string) {
  const preview = useContext(PlatformContext);
  const access = useAccess();
  return !!(preview?.permissions ?? access.data?.permissions)?.includes(permission);
}
