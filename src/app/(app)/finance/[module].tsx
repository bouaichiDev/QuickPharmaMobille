import { useLocalSearchParams } from 'expo-router';
import { lazy, Suspense } from 'react';
import { AppText, AccessGate, useCommerceAccess } from '@/features/commerce/CommerceUI';
const Cheques = lazy(() => import('@/features/finance/ChequesScreen'));
const Alerts = lazy(() => import('@/features/finance/AlertsScreen'));
const Credits = lazy(() => import('@/features/finance/CreditsScreen'));
export default function FinanceRoute() {
  const params = useLocalSearchParams<{
    module: string;
    id?: string;
    view?: string;
    notification?: string;
  }>();
  const module = String(params.module ?? 'overview');
  const { can } = useCommerceAccess();
  const permission =
    module === 'credits'
      ? 'credits.view'
      : module === 'overview'
        ? can('credits.view')
          ? 'credits.view'
          : 'payments.view'
        : 'payments.view';
  const content = (
    <Suspense fallback={<AppText>Chargement…</AppText>}>
      {module.startsWith('alert') ? (
        <Alerts
          key={`${params.id ?? module}-${params.notification ?? ''}`}
          dashboard={module === 'alerts-dashboard'}
          id={params.id}
        />
      ) : module === 'credits' || module === 'overview' ? (
        <Credits overview={module === 'overview'} id={params.id} />
      ) : (
        <Cheques
          key={`${params.id ?? module}-${params.notification ?? ''}`}
          view={module}
          id={params.id}
        />
      )}
    </Suspense>
  );
  return module.startsWith('alert') ? (
    content
  ) : (
    <AccessGate permission={permission}>{content}</AccessGate>
  );
}
