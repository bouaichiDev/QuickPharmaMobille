import { useAccess } from '@/features/access/useAccess';
import { can } from '@/features/crm/modules';
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  StockPage,
  SCard,
  SButton,
  SNote,
  STabs,
  SHeading,
  st,
  money,
  stockDate,
} from '@/features/catalogue/StockDesign';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useStockScope } from '@/features/catalogue/useStock';
import { useStockApi } from '@/features/catalogue/StockContext';
import { categoriesApi, type Category } from '../categoriesApi';

export function CategoryDetail({ category, onClose }: { category: Category; onClose: () => void }) {
  const scope = useStockScope();
  const access = useAccess();
  const canReadProducts = can(access.data, 'products.view');
  const router = useRouter();
  const api = useStockApi();
  const [days, setDays] = useState('30');
  const [tab, setTab] = useState('products');
  const [page, setPage] = useState(1);
  const summary = useQuery({
    queryKey: ['category-summary', scope, category.id, days],
    queryFn: () => categoriesApi.summary(category.id, Number(days)),
    staleTime: 30000,
  });
  const products = useQuery({
    queryKey: ['catalogue', scope, 'category-detail', category.id, page],
    queryFn: ({ signal }) => api.products({ category_id: category.id, page }, signal),
    enabled: tab === 'products' && !!summary.data?.stock && canReadProducts,
    staleTime: 30000,
  });
  const data = summary.data;
  const activity =
    tab === 'sales' || tab === 'entries' || tab === 'orders' ? data?.activity[tab] : undefined;
  return (
    <StockPage title="Détail de la catégorie" onClose={onClose}>
      <SCard>
        <SHeading title={category.name || 'Catégorie'} icon="category" />
        <AppText color="outline">{category.code}</AppText>
        <AppText>{category.description || 'Aucune description'}</AppText>
        <AppText>{category.active === 1 ? 'Active' : 'Inactive'}</AppText>
      </SCard>
      <STabs
        value={days}
        onChange={setDays}
        values={[
          ['30', '30 derniers jours'],
          ['90', '90 derniers jours'],
          ['0', 'Tout l’historique'],
        ]}
      />
      <SNote>
        Stock actuel. Les ventes, entrées et commandes correspondent à la période sélectionnée.
      </SNote>
      {summary.isLoading ? <AppText>Chargement des statistiques…</AppText> : null}
      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : null}
      {data?.stock ? (
        <SCard>
          <SHeading title="Produits & stock actuel" icon="inventory-2" />
          <View style={[st.row, { flexWrap: 'wrap' }]}>
            {[
              ['Produits liés', data.stock.references_count],
              ['Unités disponibles', data.stock.units],
              ['Sous le seuil minimum', data.stock.low_count],
            ].map(([label, value]) => (
              <View
                key={String(label)}
                style={{
                  flexGrow: 1,
                  minWidth: 110,
                  padding: 12,
                  backgroundColor: '#eff4ff',
                  borderRadius: 12,
                }}
              >
                <AppText variant="bodySm">{label}</AppText>
                <AppText variant="headlineSm">{value}</AppText>
              </View>
            ))}
          </View>
        </SCard>
      ) : null}
      <STabs
        value={tab}
        onChange={setTab}
        values={[
          ['products', 'Produits'],
          ['sales', 'Ventes'],
          ['entries', 'Entrées'],
          ['orders', 'Commandes clients'],
        ]}
      />
      {tab === 'products' && data ? (
        data.stock && canReadProducts ? (
          <SCard>
            {products.isLoading ? <AppText>Chargement des produits…</AppText> : null}
            {products.isError ? (
              <ErrorState error={products.error} onRetry={() => void products.refetch()} />
            ) : null}
            {products.data?.data.map((p) => (
              <View
                key={p.id}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: '#e5eeff',
                  gap: 4,
                }}
              >
                <AppText variant="labelLg">{p.productName}</AppText>
                <AppText color="outline">
                  {p.sku} · {p.quantity} unités · {money(p.sellingPrice)} DH
                </AppText>
              </View>
            ))}
            {products.data?.total === 0 ? (
              <SNote>Aucun produit lié à cette catégorie.</SNote>
            ) : null}
            {(products.data?.last_page || 1) > 1 ? (
              <View style={st.row}>
                <SButton
                  label="Précédent"
                  secondary
                  compact
                  disabled={page === 1 || products.isFetching}
                  onPress={() => setPage((p) => p - 1)}
                />
                <AppText>
                  {page} / {products.data?.last_page}
                </AppText>
                <SButton
                  label="Suivant"
                  secondary
                  compact
                  disabled={page >= (products.data?.last_page || 1) || products.isFetching}
                  onPress={() => setPage((p) => p + 1)}
                />
              </View>
            ) : null}
            <SButton
              label="Ouvrir ces produits dans le catalogue"
              secondary
              onPress={() => {
                onClose();
                router.push({ pathname: '/stock', params: { category_id: String(category.id) } });
              }}
            />
          </SCard>
        ) : (
          <SNote>La consultation des produits n’est pas autorisée pour ce rôle.</SNote>
        )
      ) : null}
      {tab !== 'products' && data ? (
        activity ? (
          <SCard>
            <SHeading
              title={
                tab === 'sales'
                  ? 'Ventes liées'
                  : tab === 'entries'
                    ? 'Entrées de stock liées'
                    : 'Commandes clients liées'
              }
              icon="receipt-long"
            />
            <AppText variant="headlineSm">
              {activity.documents} documents · {activity.units} unités
            </AppText>
            {activity.gross_amount !== null ? (
              <>
                <AppText variant="headlineSm" color="primary">
                  {money(activity.gross_amount)} DH
                </AppText>
                <AppText variant="bodySm" color="outline">
                  Montant brut des lignes de cette catégorie, avant remises et taxes du document.
                </AppText>
              </>
            ) : null}
            <SHeading title="5 dernières lignes" icon="history" />
            {activity.recent.length ? (
              activity.recent.map((item, index) => (
                <View
                  key={`${item.id}-${index}`}
                  style={{
                    gap: 4,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: '#e5eeff',
                  }}
                >
                  <AppText variant="labelLg">{item.productName}</AppText>
                  <AppText>
                    {item.ref} · {stockDate(item.date)}
                  </AppText>
                  <AppText color="outline">
                    {item.quantity} unités
                    {item.gross_amount !== undefined ? ` · ${money(item.gross_amount)} DH` : ''}
                  </AppText>
                </View>
              ))
            ) : (
              <SNote>Aucune opération sur cette période.</SNote>
            )}
          </SCard>
        ) : (
          <SNote>Ces statistiques ne sont pas autorisées pour ce rôle.</SNote>
        )
      ) : null}
    </StockPage>
  );
}
