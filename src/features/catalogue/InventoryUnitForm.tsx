import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ExpirationDateField } from '@/features/stores/components/ExpirationDateField';
import {
  StockPage,
  SCard,
  SField,
  SButton,
  SHeading,
  SSearch,
  SNote,
  st,
  stockDate,
  useDebounce,
} from './StockDesign';
import { type StockProduct } from './stockApi';
import {
  stockActionLabels,
  stockRequestId,
  type StockUnit,
  type StockUnitAction,
  type StockUnitChange,
  type productInventoryApi,
} from './productInventoryApi';
import { useStockScope } from './useStock';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
type Choice = 'provider' | 'location' | 'store' | 'product';
function InventoryPicker({
  title,
  options,
  value,
  onSelect,
  onClose,
  onSearch,
  loading,
}: {
  title: string;
  options: { id: number; name: string }[];
  value: number | null;
  onSelect: (id: number | null) => void;
  onClose: () => void;
  onSearch?: (v: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const shown = onSearch
    ? options
    : options.filter((o) => o.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return (
    <StockPage title={title} onClose={onClose} scroll={false}>
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <SSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            onSearch?.(v);
          }}
          placeholder="Rechercher…"
        />
        {loading ? <AppText>Chargement…</AppText> : null}
        <FlatList
          data={shown}
          keyExtractor={(o) => String(o.id)}
          initialNumToRender={12}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
          ListEmptyComponent={
            !loading ? (
              <SNote>
                Aucun résultat. Précisez votre recherche ou créez la référence dans son catalogue.
              </SNote>
            ) : null
          }
          ListHeaderComponent={
            title.includes('destination') ? null : (
              <SButton label="Non renseigné" secondary onPress={() => onSelect(null)} />
            )
          }
          renderItem={({ item }) => (
            <SButton
              label={item.name}
              secondary={value !== item.id}
              onPress={() => onSelect(item.id)}
            />
          )}
        />
      </View>
    </StockPage>
  );
}
export function InventoryUnitForm({
  product,
  action,
  selected,
  api,
  onClose,
  onSaved,
}: {
  product: StockProduct;
  action: StockUnitAction;
  selected: StockUnit[];
  api: typeof productInventoryApi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const scope = useStockScope();
  const cache = useQueryClient();
  const [quantity, setQuantity] = useState('1');
  const [expiry, setExpiry] = useState(
    action === 'edit' ? selected[0]?.expiry?.slice(0, 10) || '' : '',
  );
  const [received, setReceived] = useState(
    action === 'edit' ? selected[0]?.received_at?.slice(0, 10) || today() : today(),
  );
  const [provider, setProvider] = useState<number | null>(
    action === 'edit' ? (selected[0]?.provider_id ?? null) : null,
  );
  const [location, setLocation] = useState<number | null>(
    action === 'edit' ? (selected[0]?.location_id ?? null) : null,
  );
  const [destination, setDestination] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [targetName, setTargetName] = useState('');
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [search, setSearch] = useState('');
  const settled = useDebounce(search);
  const [requestId] = useState(stockRequestId);
  const [review, setReview] = useState<StockUnitChange | null>(null);
  const options = useQuery({
    queryKey: ['inventory-options', scope, product.id, destination, settled],
    queryFn: ({ signal }) =>
      api.options(
        product.id,
        {
          destination_store_id: destination || undefined,
          search: destination ? settled : undefined,
        },
        signal,
      ),
    enabled: ['add', 'edit', 'transfer'].includes(action),
    staleTime: 60000,
  });
  const mutation = useMutation({
    mutationFn: (input: StockUnitChange) => api.change(product.id, input),
    retry: false,
    onSuccess: async () => {
      await Promise.all(
        [
          'stock-product',
          'inventory-units',
          'inventory-movements',
          'catalogue',
          'products',
          'stock-locations',
          'category-summary',
          'stock-sessions',
          'dashboard',
          'alerts',
        ].map((key) => cache.invalidateQueries({ queryKey: [key] })),
      );
      onSaved();
    },
  });
  const named = (key: 'providers' | 'locations' | 'stores', id: number | null) =>
    options.data?.[key].find((o) => o.id === id)?.name ||
    (id ? 'Référence sélectionnée' : 'Non renseigné');
  const destinationProduct = options.data?.destination_products.find((p) => p.id === target);
  const isDates = action === 'add' || action === 'edit';
  const quantityValid = /^\d+$/.test(quantity) && Number(quantity) > 0 && Number(quantity) <= 1000;
  const datesValid =
    /^\d{4}-\d{2}-\d{2}$/.test(received) &&
    received <= today() &&
    (!expiry || (/^\d{4}-\d{2}-\d{2}$/.test(expiry) && (action !== 'add' || expiry >= today())));
  const valid =
    (action === 'add' ? quantityValid : selected.length > 0 && selected.length <= 1000) &&
    (!isDates || (datesValid && (!Number(product.hasExpiration) || !!expiry))) &&
    (!['trash', 'delete'].includes(action) || reason.trim().length >= 3) &&
    (action !== 'transfer' || (!!destination && !!target));
  function prepare() {
    if (!valid) return;
    setReview({
      action,
      request_id: requestId,
      confirmed: true,
      ...(action === 'add' ? { quantity: Number(quantity) } : { ids: selected.map((u) => u.id) }),
      ...(isDates
        ? {
            expiry: expiry || null,
            received_at: received,
            provider_id: provider,
            location_id: location,
          }
        : {}),
      ...(['trash', 'delete'].includes(action) ? { reason: reason.trim() } : {}),
      ...(action === 'transfer'
        ? { destination_store_id: destination!, destination_product_id: target! }
        : {}),
    });
  }
  const close = () => {
    if (!mutation.isPending) onClose();
  };
  const choices =
    choice === 'provider'
      ? options.data?.providers
      : choice === 'location'
        ? options.data?.locations
        : choice === 'store'
          ? options.data?.stores
          : options.data?.destination_products.map((p) => ({
              id: p.id,
              name: `${p.productName} · ${p.sku}`,
            }));
  if (choice)
    return (
      <InventoryPicker
        title={
          choice === 'provider'
            ? 'Choisir le fournisseur'
            : choice === 'location'
              ? 'Choisir l’emplacement'
              : choice === 'store'
                ? 'Établissement de destination'
                : 'Produit de destination'
        }
        options={choices || []}
        value={
          choice === 'provider'
            ? provider
            : choice === 'location'
              ? location
              : choice === 'store'
                ? destination
                : target
        }
        loading={options.isFetching}
        onSearch={choice === 'product' ? setSearch : undefined}
        onClose={() => setChoice(null)}
        onSelect={(id) => {
          if (choice === 'provider') setProvider(id);
          if (choice === 'location') setLocation(id);
          if (choice === 'store') {
            setDestination(id);
            setTarget(null);
            setTargetName('');
            setSearch('');
          }
          if (choice === 'product') {
            setTarget(id);
            setTargetName(
              options.data?.destination_products.find((p) => p.id === id)?.productName || '',
            );
          }
          setChoice(null);
        }}
      />
    );
  return (
    <StockPage
      title={review ? 'Confirmer l’opération' : stockActionLabels[action]}
      onClose={close}
      footer={
        <View style={st.row}>
          <View style={st.grow}>
            <SButton
              label={review ? 'Modifier' : 'Annuler'}
              secondary
              disabled={mutation.isPending}
              onPress={() => (review ? setReview(null) : close())}
            />
          </View>
          <View style={st.grow}>
            <SButton
              label={review ? 'Confirmer' : 'Vérifier'}
              icon="check"
              busy={mutation.isPending}
              disabled={
                mutation.isPending ||
                !valid ||
                (['add', 'edit', 'transfer'].includes(action) && options.isError)
              }
              onPress={() => (review ? mutation.mutate(review) : prepare())}
            />
          </View>
        </View>
      }
    >
      <SCard>
        <SHeading title={product.productName} icon="inventory-2" />
        <AppText>
          {stockActionLabels[action]} · {action === 'add' ? quantity : selected.length} unité(s)
        </AppText>
      </SCard>
      {options.isError ? (
        <ErrorState error={options.error} onRetry={() => void options.refetch()} />
      ) : null}
      {review ? (
        <SCard>
          <SHeading title="Récapitulatif" icon="fact-check" />
          {isDates ? (
            <>
              <AppText>Réception : {stockDate(received)}</AppText>
              <AppText>Péremption : {expiry ? stockDate(expiry) : 'Non renseignée'}</AppText>
              <AppText>Fournisseur : {named('providers', provider)}</AppText>
              <AppText>Emplacement : {named('locations', location)}</AppText>
            </>
          ) : null}
          {action === 'transfer' ? (
            <>
              <AppText>Destination : {named('stores', destination)}</AppText>
              <AppText>
                Produit : {destinationProduct?.productName || targetName || 'Produit sélectionné'}
              </AppText>
              <SNote>
                Les unités garderont leurs dates et seront placées sans fournisseur ni emplacement
                dans l’établissement de destination.
              </SNote>
            </>
          ) : null}
          {reason ? <AppText>Motif : {reason.trim()}</AppText> : null}
          {action === 'delete' ? (
            <SNote error>
              Les unités sélectionnées seront supprimées définitivement. Le mouvement de sortie
              restera dans l’historique.
            </SNote>
          ) : null}
          <SNote>Vérifiez ces informations avant de confirmer.</SNote>
        </SCard>
      ) : (
        <SCard>
          {action === 'add' ? (
            <SField
              label="Quantité à ajouter (1 à 1000)"
              value={quantity}
              onChange={setQuantity}
              numeric
            />
          ) : null}
          {isDates ? (
            <>
              {action === 'edit' ? (
                <SNote>Ces valeurs seront appliquées à toutes les unités sélectionnées.</SNote>
              ) : null}
              <ResponsiveGrid maxColumns={2}>
                <ExpirationDateField
                  label="Date de réception"
                  placeholder="Choisir une date"
                  value={received}
                  locale="fr"
                  doneLabel="Valider"
                  onChange={setReceived}
                />
                <ExpirationDateField
                  label={
                    Number(product.hasExpiration)
                      ? 'Date de péremption *'
                      : 'Date de péremption (facultative)'
                  }
                  placeholder="Choisir une date"
                  value={expiry}
                  locale="fr"
                  doneLabel="Valider"
                  onChange={setExpiry}
                />
              </ResponsiveGrid>
              {received > today() ? (
                <SNote error>La réception ne peut pas être dans le futur.</SNote>
              ) : null}
              {action === 'add' && expiry && expiry < today() ? (
                <SNote error>La péremption des nouvelles unités ne peut pas être passée.</SNote>
              ) : null}
              {!Number(product.hasExpiration) && expiry ? (
                <SButton label="Sans péremption" secondary compact onPress={() => setExpiry('')} />
              ) : null}
              <ResponsiveGrid maxColumns={2}>
                <SButton
                  label={`Fournisseur : ${named('providers', provider)}`}
                  secondary
                  icon="expand-more"
                  onPress={() => setChoice('provider')}
                />
                <SButton
                  label={`Emplacement : ${named('locations', location)}`}
                  secondary
                  icon="expand-more"
                  onPress={() => setChoice('location')}
                />
              </ResponsiveGrid>
            </>
          ) : null}
          {['trash', 'delete'].includes(action) ? (
            <SField label="Motif *" value={reason} onChange={setReason} multiline />
          ) : null}
          {action === 'transfer' ? (
            <>
              <SButton
                label={`Établissement : ${named('stores', destination)}`}
                secondary
                icon="expand-more"
                onPress={() => setChoice('store')}
              />
              <SButton
                label={`Produit de destination : ${destinationProduct?.productName || targetName || 'Choisir'}`}
                secondary
                icon="expand-more"
                disabled={!destination}
                onPress={() => setChoice('product')}
              />
              {options.data && !options.data.stores.length ? (
                <SNote>Aucun autre établissement accessible avec le droit de transfert.</SNote>
              ) : null}
              <SNote>Choisissez le produit correspondant dans le catalogue de destination.</SNote>
            </>
          ) : null}
        </SCard>
      )}
      {mutation.isError ? (
        <ErrorState
          error={mutation.error}
          onRetry={review ? () => mutation.mutate(review) : undefined}
        />
      ) : null}
    </StockPage>
  );
}
