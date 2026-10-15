import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAccess } from '@/features/access/useAccess';
import { can } from '@/features/crm/modules';
import { useStockApi, StockContext } from './StockContext';
import { useStockScope } from './useStock';
import { InventoryUnitForm } from './InventoryUnitForm';
import {
  productInventoryApi,
  stockActionLabels,
  type StockUnit,
  type StockUnitAction,
} from './productInventoryApi';
import {
  StockPage,
  SCard,
  SHeading,
  SButton,
  SNote,
  SSearch,
  STabs,
  st,
  stockDate,
  useDebounce,
} from './StockDesign';
import type { StockProduct } from './stockApi';

function Pager({
  page,
  last,
  fetching,
  onChange,
}: {
  page: number;
  last: number;
  fetching: boolean;
  onChange: (n: number) => void;
}) {
  return last > 1 ? (
    <View style={st.row}>
      <View style={st.grow}>
        <SButton
          label="Précédent"
          secondary
          compact
          disabled={page <= 1 || fetching}
          onPress={() => onChange(page - 1)}
        />
      </View>
      <AppText>
        {page} / {last}
      </AppText>
      <View style={st.grow}>
        <SButton
          label="Suivant"
          secondary
          compact
          disabled={page >= last || fetching}
          onPress={() => onChange(page + 1)}
        />
      </View>
    </View>
  ) : null;
}
export function ProductInventory({
  product,
  onClose,
  onDetail,
  onPlace,
}: {
  product: StockProduct;
  onClose: () => void;
  onDetail: () => void;
  onPlace?: (product: StockProduct) => void;
}) {
  const api = useStockApi();
  const { width } = useWindowDimensions();
  const scope = useStockScope();
  const actualAccess = useAccess();
  const preview = useContext(StockContext);
  const access = preview?.access || actualAccess.data;
  const inventoryApi = preview?.inventoryApi || productInventoryApi;
  const configured = !preview || !!preview.inventoryApi;
  const canAdjust = can(access, 'stock.adjust');
  const canTransfer = can(access, 'stock.transfer');
  const canRead = can(access, 'stock.view');
  const [tab, setTab] = useState('units');
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [search, setSearch] = useState('');
  const settled = useDebounce(search);
  const [expiry, setExpiry] = useState('all');
  const [selected, setSelected] = useState<Record<number, StockUnit>>({});
  const selection = Object.values(selected);
  const [action, setAction] = useState<StockUnitAction | null>(null);
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['stock-product', scope, product.id],
    queryFn: ({ signal }) => api.detail(product.id, signal),
    enabled: !!scope,
  });
  const units = useQuery({
    queryKey: ['inventory-units', scope, product.id, page, settled, expiry],
    queryFn: ({ signal }) =>
      inventoryApi.units(product.id, { page, search: settled || undefined, expiry }, signal),
    enabled: !!scope && canRead && configured && tab === 'units',
  });
  const history = useQuery({
    queryKey: ['inventory-movements', scope, product.id, historyPage],
    queryFn: ({ signal }) => inventoryApi.movements(product.id, historyPage, signal),
    enabled: !!scope && canRead && configured && tab === 'movements',
  });
  const data = query.data;
  const labels: Record<string, string> = {
    in: 'Entrée',
    out: 'Sortie',
    transfer: 'Transfert',
    adjustment: 'Ajustement',
    recall: 'Rappel',
  };
  function toggle(unit: StockUnit) {
    setSelected((previous) => {
      const next = { ...previous };
      if (next[unit.id]) delete next[unit.id];
      else if (Object.keys(next).length < 1000) next[unit.id] = unit;
      return next;
    });
  }
  function selectPage() {
    setSelected((previous) => {
      const next = { ...previous };
      for (const unit of units.data?.data || [])
        if (Object.keys(next).length < 1000) next[unit.id] = unit;
      return next;
    });
  }
  function begin(mode: StockUnitAction) {
    setNotice('');
    setAction(mode);
  }
  if (action)
    return (
      <InventoryUnitForm
        product={data?.product || product}
        action={action}
        selected={selection}
        api={inventoryApi}
        onClose={() => setAction(null)}
        onSaved={() => {
          setAction(null);
          setSelected({});
          setPage(1);
          setNotice('Stock mis à jour.');
        }}
      />
    );
  return (
    <StockPage
      title="Inventaire du produit"
      onClose={onClose}
      footer={
        <View style={st.row}>
          {onPlace && data ? (
            <View style={st.grow}>
              <SButton
                label="Emplacement"
                secondary
                icon="place"
                onPress={() => onPlace(data.product)}
              />
            </View>
          ) : null}
          <View style={st.grow}>
            <SButton label="Fiche produit" icon="visibility" onPress={onDetail} />
          </View>
        </View>
      }
    >
      <ResponsiveGrid maxColumns={2}>
        <SCard>
          <SHeading title={product.productName} icon="inventory-2" />
          <AppText color="outline">{product.sku}</AppText>
          {canAdjust ? (
            <SButton
              label="Ajouter des unités"
              icon="add"
              disabled={!configured || query.isError || query.isLoading}
              onPress={() => begin('add')}
            />
          ) : null}
        </SCard>
        {data ? (
          <SCard>
            <SHeading title="Stock disponible" icon="inventory-2" />
            <AppText variant="headlineLg" color="primary">
              {data.product.quantity} unités
            </AppText>
            <AppText>Seuil minimum : {data.product.minQuantity}</AppText>
            <AppText>{data.product.locationName || 'Aucun emplacement'}</AppText>
          </SCard>
        ) : null}
      </ResponsiveGrid>
      {preview ? (
        <SNote>Mode démonstration : les modifications restent dans cet aperçu.</SNote>
      ) : null}
      {notice ? <SNote>{notice}</SNote> : null}
      {query.isLoading ? <AppText>Chargement du stock…</AppText> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      <STabs
        value={tab}
        onChange={setTab}
        values={[
          ['units', 'Unités'],
          ['lots', 'Lots & emplacements'],
          ['movements', 'Mouvements'],
        ]}
      />
      {!configured ? (
        <SNote>La gestion des unités n’est pas configurée dans cet aperçu.</SNote>
      ) : !canRead ? (
        <SNote>La consultation du stock n’est pas autorisée pour ce rôle.</SNote>
      ) : null}
      {tab === 'units' && configured && canRead ? (
        <>
          <SCard>
            <SSearch
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Rechercher un fournisseur, un emplacement…"
            />
            <STabs
              value={expiry}
              onChange={(v) => {
                setExpiry(v);
                setPage(1);
              }}
              values={[
                ['all', 'Toutes'],
                ['expired', 'Périmées'],
                ['none', 'Sans péremption'],
              ]}
            />
            <AppText>
              {units.data?.total ?? '—'} unités · {selection.length} sélectionnées (toutes pages)
            </AppText>
            {canAdjust || canTransfer ? (
              <>
                <View style={st.row}>
                  <View style={st.grow}>
                    <SButton
                      label="Sélectionner cette page"
                      secondary
                      compact
                      disabled={!units.data?.data.length || selection.length >= 1000}
                      onPress={selectPage}
                    />
                  </View>
                  <View style={st.grow}>
                    <SButton
                      label="Effacer la sélection"
                      secondary
                      compact
                      disabled={!selection.length}
                      onPress={() => setSelected({})}
                    />
                  </View>
                </View>
                {selection.length >= 1000 ? (
                  <SNote>Maximum 1000 unités par opération.</SNote>
                ) : null}
                <View style={[st.row, { flexWrap: 'wrap', alignItems: 'stretch' }]}>
                  {(['edit', 'trash', 'delete', 'transfer'] as StockUnitAction[])
                    .filter((mode) => (mode === 'transfer' ? canTransfer : canAdjust))
                    .map((mode) => (
                      <View
                        key={mode}
                        style={{
                          flexGrow: 1,
                          flexBasis: width >= 1000 ? '22%' : '46%',
                          minWidth: 140,
                        }}
                      >
                        <SButton
                          label={stockActionLabels[mode]}
                          icon={
                            mode === 'edit'
                              ? 'edit'
                              : mode === 'transfer'
                                ? 'swap-horiz'
                                : mode === 'trash'
                                  ? 'delete-sweep'
                                  : 'delete-outline'
                          }
                          secondary
                          disabled={!selection.length || units.isError}
                          onPress={() => begin(mode)}
                        />
                      </View>
                    ))}
                </View>
              </>
            ) : (
              <SNote>Consultation seule pour ce rôle.</SNote>
            )}
          </SCard>
          {units.isLoading ? <AppText>Chargement des unités…</AppText> : null}
          {units.isError ? (
            <ErrorState error={units.error} onRetry={() => void units.refetch()} />
          ) : null}
          <ResponsiveGrid>
            {units.data?.data.map((unit, index) => (
              <Pressable
                key={unit.id}
                accessibilityRole="checkbox"
                accessibilityLabel={`Sélectionner unité ${unit.id}`}
                accessibilityState={{
                  checked: !!selected[unit.id],
                  disabled: !canAdjust && !canTransfer,
                }}
                disabled={
                  (!canAdjust && !canTransfer) || (!selected[unit.id] && selection.length >= 1000)
                }
                onPress={() => toggle(unit)}
                style={[
                  st.card,
                  { borderColor: selected[unit.id] ? '#006a63' : '#e5eeff', gap: 6 },
                ]}
              >
                <View style={st.row}>
                  <Icon
                    name={selected[unit.id] ? 'check-box' : 'check-box-outline-blank'}
                    color={selected[unit.id] ? 'secondary' : 'outline'}
                  />
                  <AppText variant="labelLg" style={st.grow}>
                    Unité {(page - 1) * 25 + index + 1} ·{' '}
                    {unit.provider || 'Fournisseur non renseigné'}
                  </AppText>
                </View>
                <AppText>{unit.location || 'Emplacement non renseigné'}</AppText>
                <AppText color="outline">
                  Péremption : {unit.expiry ? stockDate(unit.expiry) : 'Non renseignée'}
                </AppText>
                <AppText color="outline">
                  Réception : {unit.received_at ? stockDate(unit.received_at) : 'Non renseignée'}
                </AppText>
              </Pressable>
            ))}
          </ResponsiveGrid>
          {units.data?.total === 0 ? (
            <SNote>Aucune unité disponible pour ces filtres.</SNote>
          ) : null}
          <Pager
            page={page}
            last={units.data?.last_page || 1}
            fetching={units.isFetching}
            onChange={setPage}
          />
        </>
      ) : null}
      {tab === 'lots' && data ? (
        <SCard>
          <SHeading title="Lots & emplacements" icon="view-module" />
          {data.lots.length ? (
            data.lots.slice(0, 25).map((lot, i) => (
              <View
                key={`${lot.location_id}-${lot.expiry}-${i}`}
                style={{ padding: 12, backgroundColor: '#eff4ff', borderRadius: 12, gap: 4 }}
              >
                <AppText variant="labelLg">
                  {lot.location || 'Non affecté'} · {lot.quantity} unités
                </AppText>
                {lot.reference ? <AppText>Lot {lot.reference}</AppText> : null}
                <AppText color="outline">
                  {lot.expiry
                    ? `Péremption : ${stockDate(lot.expiry)}`
                    : 'Péremption non renseignée'}
                </AppText>
              </View>
            ))
          ) : (
            <SNote>Aucune unité disponible dans le stock de ce produit.</SNote>
          )}
          {data.lots.length > 25 ? (
            <SNote>
              25 premiers groupes affichés. L’onglet Unités permet de consulter et gérer toutes les
              unités par pages.
            </SNote>
          ) : null}
        </SCard>
      ) : null}
      {tab === 'movements' && configured && canRead ? (
        <SCard>
          <SHeading title="Historique des mouvements" icon="history" />
          {history.isLoading ? <AppText>Chargement des mouvements…</AppText> : null}
          {history.isError ? (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          ) : null}
          {history.data?.data.map((item) => (
            <View
              key={item.id}
              style={{ gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e5eeff' }}
            >
              <AppText variant="labelLg">
                {item.source === 'transfer'
                  ? item.type === 'in'
                    ? 'Transfert entrant'
                    : 'Transfert sortant'
                  : item.source === 'trash'
                    ? 'Mise au rebut'
                    : item.source === 'delete'
                      ? 'Suppression'
                      : item.source === 'update'
                        ? 'Modification'
                        : labels[item.type] || 'Mouvement de stock'}{' '}
                · {item.quantity} unités
              </AppText>
              <AppText color="outline">
                {stockDate(item.created_at)}
                {item.creator ? ` · ${item.creator}` : ''}
              </AppText>
              {item.from_location || item.to_location ? (
                <AppText>
                  {item.from_location || 'Non affecté'} → {item.to_location || 'Non affecté'}
                </AppText>
              ) : null}
              {item.notes ? <AppText>{item.notes}</AppText> : null}
            </View>
          ))}
          {history.data?.total === 0 ? <SNote>Aucun mouvement enregistré.</SNote> : null}
          <Pager
            page={historyPage}
            last={history.data?.last_page || 1}
            fetching={history.isFetching}
            onChange={setHistoryPage}
          />
        </SCard>
      ) : null}
    </StockPage>
  );
}
