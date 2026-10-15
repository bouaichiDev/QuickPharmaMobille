import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useStockApi } from './StockContext';
import { useStockScope } from './useStock';
import type { StockProduct } from './stockApi';
import { StockPage, SCard, SButton, SBadge, SNote, st, money, stockDate } from './StockDesign';
export default function ProductSalesHistory({
  product,
  onClose,
}: {
  product: StockProduct;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1),
    api = useStockApi(),
    scope = useStockScope();
  const query = useQuery({
    queryKey: ['stock-product-sales', scope, product.id, page],
    queryFn: () => api.sales(product.id, page),
    staleTime: 30000,
  });
  return (
    <StockPage title="Historique des ventes" onClose={onClose}>
      <AppText variant="headlineSm">{product.productName}</AppText>
      <AppText variant="bodySm" color="outline">
        {query.data?.total || 0} ventes · {product.sku}
      </AppText>
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data?.rows.map((row, i) => (
        <SCard key={`${row.id}-${i}`}>
          <View style={st.row}>
            <Icon name="point-of-sale" color="primary" />
            <View style={st.grow}>
              <AppText variant="labelLg">{String(row.ref || 'Vente enregistrée')}</AppText>
              <AppText variant="bodySm" color="outline">
                {String(row.customer || 'Client comptoir')}
              </AppText>
            </View>
            <SBadge label={String(row.paymentStatusLabel || 'Vente')} />
          </View>
          <View style={st.row}>
            <AppText variant="bodySm" style={st.grow}>
              {stockDate(String(row.date || row.created_at || ''))}
            </AppText>
            <AppText variant="labelLg" color="primary">
              {Number(row.quantity) || 0} × {money(Number(row.itemPrice) || 0)} DH
            </AppText>
          </View>
        </SCard>
      ))}
      {query.data?.rows.length === 0 ? (
        <SNote>Aucune vente enregistrée pour ce produit dans cet établissement.</SNote>
      ) : null}
      {query.data && query.data.lastPage > 1 ? (
        <View style={st.row}>
          <View style={st.grow}>
            <SButton
              label="Précédent"
              secondary
              disabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
            />
          </View>
          <AppText>
            {page} / {query.data.lastPage}
          </AppText>
          <View style={st.grow}>
            <SButton
              label="Suivant"
              secondary
              disabled={page >= query.data.lastPage}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        </View>
      ) : null}
    </StockPage>
  );
}
