import { ResponsiveList } from '@/components/ui/ResponsiveGrid';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet } from '@/services/api/client';
import { itemId, listPayload, type CrmRecord } from '@/features/crm/crmApi';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { PosAvatar, PosBadge, PosButton, PosPage, PosSearch, pos, s } from './SalesDesign';

export function customerName(row?: CrmRecord) {
  if (!row) return 'Choisir un client';
  return String(
    row.customer ??
      row.name ??
      row.label ??
      ([row.FirstName ?? row.firstName, row.LastName ?? row.lastName].filter(Boolean).join(' ') ||
        'Client'),
  );
}
export function isCounter(row: CrmRecord) {
  return /^(default customer|client comptoir|comptoir)$/i.test(customerName(row).trim());
}
export function useSalesCustomers() {
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  return useQuery({
    queryKey: ['sales-customers', store],
    queryFn: async ({ signal }) => listPayload(await apiGet('/customerDropdown', { signal })).rows,
    enabled: !!store,
    staleTime: 300000,
  });
}
export function CustomerSummary({
  customer,
  onChange,
}: {
  customer?: CrmRecord;
  onChange: () => void;
}) {
  const name = customerName(customer);
  return (
    <View style={[s.card, s.row]}>
      <PosAvatar name={name} />
      <View style={s.grow}>
        <AppText variant="headlineSm" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="bodySm" color="outline" numberOfLines={1}>
          {customer
            ? isCounter(customer)
              ? 'Client comptoir • Vente de passage'
              : String(customer.Phone ?? customer.phone ?? 'Client enregistré')
            : 'Sélectionnez le bénéficiaire de la vente'}
        </AppText>
      </View>
      <PosButton label="Changer" compact secondary icon="swap-horiz" onPress={onChange} />
    </View>
  );
}
export function SalesCustomerPicker({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (row: CrmRecord) => void;
  onClose: () => void;
}) {
  const query = useSalesCustomers();
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(value);
  const rows = useMemo(
    () =>
      (query.data ?? [])
        .filter((row) =>
          `${customerName(row)} ${String(row.Phone ?? row.phone ?? '')}`
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()),
        )
        .sort((a, b) => Number(isCounter(b)) - Number(isCounter(a))),
    [query.data, search],
  );
  const selected = query.data?.find((row) => itemId(row) === selection);
  return (
    <PosPage
      title="Sélection client"
      scroll={false}
      onClose={onClose}
      footer={
        <PosButton
          label="Confirmer la sélection"
          icon="check"
          disabled={!selected}
          onPress={() => {
            if (selected) onSelect(selected);
          }}
        />
      }
    >
      <ResponsiveList
        data={rows}
        keyExtractor={itemId}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <View style={s.stack}>
            <PosSearch
              value={search}
              onChange={setSearch}
              placeholder="Rechercher par nom ou téléphone…"
            />
            {query.isError ? (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            ) : null}
            <AppText variant="headlineSm">
              Clients enregistrés{' '}
              <AppText variant="bodySm" color="outline">
                ({rows.length})
              </AppText>
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <AppText color="outline">
            {query.isLoading ? 'Chargement des clients…' : 'Aucun client trouvé.'}
          </AppText>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={customerName(item)}
            accessibilityState={{ selected: selection === itemId(item) }}
            onPress={() => setSelection(itemId(item))}
            style={[
              s.card,
              s.row,
              selection === itemId(item) && { borderColor: pos.teal, borderWidth: 1 },
            ]}
          >
            <PosAvatar name={customerName(item)} />
            <View style={[s.grow, { gap: 6 }]}>
              <AppText variant="headlineSm" numberOfLines={1}>
                {customerName(item)}
              </AppText>
              <AppText variant="bodySm" color="outline">
                {String(item.Phone ?? item.phone ?? '') ||
                  (isCounter(item) ? 'Vente directe de passage' : 'Client enregistré')}
              </AppText>
              {isCounter(item) ? (
                <PosBadge label="Client comptoir" tone="teal" icon="storefront" />
              ) : null}
            </View>
            {selection === itemId(item) ? (
              <Icon name="check-circle" color="secondary" />
            ) : (
              <Icon name="radio-button-unchecked" color="outline" size={20} />
            )}
          </Pressable>
        )}
      />
    </PosPage>
  );
}
