import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { LockedFeature } from '@/components/feedback/LockedFeature';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/useTranslation';
import { accessCodeMessage } from '@/utils/accessMessage';

import type { PermissionDecision } from './decisions';
import { useAnyPermission, useCanManageSubscription } from './hooks';

interface PermissionGateProps {
  /** Any of these permissions unlocks the content. */
  anyOf: readonly string[];
  children: ReactNode;
  /** 'hide' renders nothing when denied, 'lock' shows the padlock state. */
  mode?: 'hide' | 'lock';
  compact?: boolean;
}

export function useDecisionMessage() {
  const translator = useTranslation();
  return (decision: PermissionDecision): string => {
    if (!decision.code) return '';
    const base = accessCodeMessage(decision.code, null, translator);
    const reason = decision.reason
      ? translator.tDynamic(`access.reasons.${decision.reason}`, '')
      : '';
    return reason ? `${base} ${reason}` : base;
  };
}

/**
 * Visual guard only: the API enforces the same rule and its 403/409 are
 * handled by the HTTP client and the screens.
 */
export function PermissionGate({ anyOf, children, mode = 'lock', compact }: PermissionGateProps) {
  const decision = useAnyPermission(anyOf);
  const canManage = useCanManageSubscription();
  const describe = useDecisionMessage();
  const { t } = useTranslation();
  const router = useRouter();

  if (decision.state === 'loading') return <Skeleton height={compact ? 64 : 120} />;
  if (decision.state === 'allowed') return <>{children}</>;
  if (mode === 'hide') return null;

  // Plan comparison is offered only to a manager who can act on it.
  const planRelated = decision.kind === 'plan';
  return (
    <LockedFeature
      compact={compact}
      title={t('mobile.access.lockedTitle')}
      reason={describe(decision)}
      hint={planRelated && !canManage ? t('mobile.access.contactManager') : undefined}
      upgradeLabel={planRelated && canManage ? t('mobile.access.seePlans') : undefined}
      onUpgrade={planRelated && canManage ? () => router.push('/plans') : undefined}
    />
  );
}
