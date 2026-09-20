import { useMemo } from 'react';

import {
  decideAny,
  decidePermission,
  featureState,
  holdsPermission,
  quotaView,
  type PermissionDecision,
  type QuotaView,
} from './decisions';
import { useAccess } from './useAccess';

/** 1. Is the user allowed to perform the action (role + restrictions)? */
export function usePermission(permission: string): PermissionDecision {
  const { data } = useAccess();
  return useMemo(() => decidePermission(data, permission), [data, permission]);
}

export function useAnyPermission(permissions: readonly string[]): PermissionDecision {
  const { data } = useAccess();
  const key = permissions.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => decideAny(data, permissions), [data, key]);
}

/** 2. Does the active plan (or a trial/override) include the feature? */
export function usePlanFeature(feature: string) {
  const { data, isLoading } = useAccess();
  return useMemo(() => {
    const state = featureState(data, feature);
    return {
      loading: isLoading,
      enabled: state?.enabled ?? false,
      lapsed: state?.lapsed ?? false,
      reason: state?.reason ?? null,
      source: state?.source ?? 'none',
    };
  }, [data, feature, isLoading]);
}

/** 3. Has a plan limit been reached? */
export function useQuota(key: string): QuotaView {
  const { data } = useAccess();
  return useMemo(() => quotaView(data, key), [data, key]);
}

export function useSubscription() {
  const { data, isLoading, error, refetch } = useAccess();
  return {
    subscription: data?.subscription ?? null,
    isPlatform: data?.subscription?.terms === 'platform',
    loading: isLoading,
    error,
    refetch,
  };
}

/** Plans may be purchased/changed only by a manager holding subscription.manage. */
export function useCanManageSubscription(): boolean {
  const { data } = useAccess();
  return decidePermission(data, 'subscription.manage').state === 'allowed';
}

export function useHoldsPermission(permission: string): boolean {
  const { data } = useAccess();
  return holdsPermission(data, permission);
}
