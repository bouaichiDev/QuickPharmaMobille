import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { CrmSection, crmStyles } from '@/features/crm/components/CrmDesign';
import { record, unwrap } from '@/features/crm/crmApi';
import { apiGet } from '@/services/api/client';

/** Platform metrics use the same global endpoints as the web, without a store context. */
export function PlatformDashboard() {
  const query = useQuery({
    queryKey: ['dashboard', 'platform'],
    queryFn: async () => {
      const [overview, snapshot] = await Promise.all([
        apiGet('/superadmin/overview', { skipStoreContext: true }),
        apiGet('/superadmin/dashboard/snapshot', { skipStoreContext: true }),
      ]);
      return { overview: record(unwrap(overview)), snapshot: record(unwrap(snapshot)) };
    },
    staleTime: 120000,
  });
  if (query.isLoading) return <SkeletonCards count={4} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const overview = query.data?.overview ?? {};
  const snapshot = query.data?.snapshot ?? {};
  const tenants = record(overview.tenants);
  const revenue = record(overview.revenue);
  const subscriptions = record(overview.subscriptions);
  const today = record(snapshot.new_today);
  const groups = [
    [
      'Plateforme',
      [
        ['Établissements', tenants.stores_total],
        ['Utilisateurs', tenants.users_total],
        ['Établissements abonnés', tenants.stores_subscribed],
        ['Sans abonnement', tenants.stores_without_subscription],
      ],
    ],
    [
      'Abonnements',
      [
        ['Actifs', subscriptions.active],
        ['Expirés', subscriptions.expired],
        ['Expiration sous 7 jours', subscriptions.expiring_in_7_days],
        ['En attente', subscriptions.pending],
      ],
    ],
    [
      'Revenus des abonnements',
      [
        ['Revenu mensuel récurrent', revenue.mrr],
        ['Revenu annuel récurrent', revenue.arr],
        ['Total encaissé', revenue.collected_total],
        ['Montant en attente', revenue.pending_total],
      ],
    ],
    [
      'Activité du jour',
      [
        ['Établissements actifs', snapshot.active_stores_today],
        ['Nouveaux établissements', today.stores],
        ['Nouveaux utilisateurs', today.users],
        ['Nouveaux abonnements', today.subscriptions],
      ],
    ],
  ] as const;
  return (
    <View style={{ gap: 16 }}>
      {groups.map(([title, metrics]) => (
        <CrmSection key={title} title={title} icon="admin-panel-settings">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {metrics.map(([label, value]) => (
              <View
                key={label}
                style={[crmStyles.inset, { flexGrow: 1, flexBasis: '45%', gap: 8 }]}
              >
                <AppText variant="bodySm" color="outline">
                  {label}
                </AppText>
                <AppText variant="headlineSm" color="primary">
                  {value == null ? '—' : String(value)}
                </AppText>
              </View>
            ))}
          </View>
        </CrmSection>
      ))}
    </View>
  );
}
