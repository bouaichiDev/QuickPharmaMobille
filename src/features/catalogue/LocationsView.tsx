import { useStockApi } from './StockContext';
import { lazy, Suspense, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ProductPhoto } from './ProductPhoto';
import { LocationCard, LocationProductCard } from './LocationCards';
import { locationInfo, locationZones } from './stockPresentation';
import { BarcodeFlow } from './BarcodeFlow';
import { type StockProduct, type StockLocation } from './stockApi';
import { useStockLocations, useStockMutation, useStockScope } from './useStock';
import {
  SButton,
  SCard,
  SField,
  SHeading,
  SBadge,
  SNote,
  SSearch,
  StockPage,
  st,
  useDebounce,
  STabs,
  money,
  StockScopeBanner,
} from './StockDesign';
const LocationLabel = lazy(() => import('./LocationLabel'));
export function LocationSelector({
  product,
  initialLocation,
  onClose,
  onSaved,
}: {
  product: StockProduct;
  initialLocation?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const stockApi = useStockApi();
  const query = useStockLocations();
  const [search, setSearch] = useState('');
  const [hint, setHint] = useState(product.location_hint || '');
  const [selected, setSelected] = useState<number | null | undefined>(initialLocation);
  const current = query.data?.find((l) => l.name === product.locationName)?.id;
  const chosen = selected === undefined ? current : selected;
  const [error, setError] = useState<unknown>();
  const save = useStockMutation((id: number | null) =>
    stockApi.assignLocation(product.id, id, hint),
  );
  async function confirm() {
    if (chosen === undefined) return;
    try {
      await save.mutateAsync(chosen);
      onSaved();
    } catch (e) {
      setError(e);
    }
  }
  return (
    <StockPage
      title="Sélecteur d’emplacement"
      onClose={onClose}
      footer={
        <SButton
          label="Confirmer le changement d’emplacement"
          icon="save"
          onPress={() => void confirm()}
          busy={save.isPending}
          disabled={chosen === undefined}
        />
      }
    >
      <SCard>
        <View style={st.row}>
          <ProductPhoto product={product} size={54} />
          <View style={st.grow}>
            <AppText variant="labelSm" color="primary">
              MÉDICAMENT LISTÉ
            </AppText>
            <AppText variant="headlineSm">{product.productName}</AppText>
            <AppText variant="bodySm" color="outline">
              {product.description || product.sku}
            </AppText>
            <SBadge label={`${product.quantity} unités en inventaire`} tone="teal" />
          </View>
        </View>
        <View style={[st.row, { backgroundColor: '#eff4ff', padding: 10, borderRadius: 8 }]}>
          <Icon name="place" color="primary" size={18} />
          <View style={st.grow}>
            <AppText variant="labelSm" color="outline">
              Emplacement actuel
            </AppText>
            <AppText variant="labelMd">{product.locationName || 'Aucun emplacement'}</AppText>
          </View>
          <SBadge label={product.locationName ? 'Assigné' : 'En transit'} tone="teal" />
        </View>
      </SCard>
      <SSearch
        value={search}
        onChange={setSearch}
        placeholder="Rechercher une zone, un rayon, un frigo…"
      />
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: chosen === null }}
        onPress={() => setSelected(null)}
      >
        <SCard>
          <SHeading
            title="Aucun emplacement (en transit)"
            icon="local-shipping"
            aside={
              <Icon
                name={chosen === null ? 'radio-button-checked' : 'radio-button-unchecked'}
                color="primary"
              />
            }
          />
          <AppText variant="bodySm" color="outline">
            Produit non affecté à une zone de stockage.
          </AppText>
        </SCard>
      </Pressable>
      <SHeading
        title="Rayons & compartiments disponibles"
        icon="view-module"
        aside={
          <AppText variant="labelSm" color="outline">
            {query.data?.length || 0} zones
          </AppText>
        }
      />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data
        ?.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
        .map((l) => (
          <Pressable
            key={l.id}
            accessibilityRole="radio"
            accessibilityLabel={l.name}
            accessibilityState={{ checked: chosen === l.id }}
            onPress={() => setSelected(l.id)}
          >
            <View
              style={[
                st.card,
                { padding: 12, gap: 8 },
                {
                  borderColor: chosen === l.id ? '#00417c' : '#e5eeff',
                  backgroundColor: chosen === l.id ? '#eff4ff' : '#fff',
                },
              ]}
            >
              <View style={st.row}>
                <Icon
                  name={chosen === l.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                  color="primary"
                  size={20}
                />
                <View style={st.grow}>
                  <AppText variant="labelLg">{l.name}</AppText>
                  <AppText variant="bodySm" color="outline">
                    {l.description || `${l.products} produits • ${l.quantity} unités`}
                  </AppText>
                </View>
                <Icon name={locationInfo(l).icon} color="primary" />
              </View>
            </View>
          </Pressable>
        ))}
      <SField label="Précision du bac ou du casier (optionnel)" value={hint} onChange={setHint} />
      <View style={st.row}>
        {['01', '02', '03'].map((n) => (
          <View style={st.grow} key={n}>
            <SButton label={n} secondary compact onPress={() => setHint(`Bac ${n}`)} />
          </View>
        ))}
      </View>
      <SCard>
        <SHeading title="Aperçu de l’emplacement" icon="view-in-ar" />
        <View
          style={{
            minHeight: 100,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: '#d3e4fe',
          }}
        >
          <View style={[st.row, { padding: 12, borderRadius: 20, backgroundColor: '#fff' }]}>
            <Icon name="place" color="secondary" size={18} />
            <AppText variant="labelMd">
              {chosen === null
                ? 'En transit'
                : query.data?.find((l) => l.id === chosen)?.name || 'Choisissez un rayon'}
            </AppText>
          </View>
        </View>
      </SCard>
      <SNote>
        Les unités disponibles de ce produit dans l’établissement actif seront déplacées ensemble.
        Les autres établissements ne sont pas modifiés.
      </SNote>
      {error ? <ErrorState error={error} /> : null}
    </StockPage>
  );
}
export function LocationsView({
  onClose,
  onProduct,
  onInventory,
  canManage,
  canCount,
  canEditBarcode = false,
}: {
  onClose: () => void;
  onProduct: (p: StockProduct) => void;
  onInventory: (location?: StockLocation) => void;
  canManage: boolean;
  canCount: boolean;
  canEditBarcode?: boolean;
}) {
  const stockApi = useStockApi();
  const scope = useStockScope();
  const query = useStockLocations();
  const [selected, setSelected] = useState<StockLocation>();
  const [assign, setAssign] = useState(false);
  const [assignProduct, setAssignProduct] = useState<StockProduct>();
  const [search, setSearch] = useState('');
  const settled = useDebounce(search);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [zone, setZone] = useState('all');
  const [formZone, setFormZone] = useState('otc');
  const [code, setCode] = useState('');
  const [shelves, setShelves] = useState('');
  const [capacity, setCapacity] = useState('');
  const [editingId, setEditingId] = useState<number>();
  const [barcodeProduct, setBarcodeProduct] = useState<StockProduct>();
  const [productFilter, setProductFilter] = useState('all');
  const [locationScanner, setLocationScanner] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<unknown>();
  const add = useStockMutation(() =>
    stockApi.createLocation(
      name.trim(),
      description.trim(),
      {
        zone: formZone,
        code: code.trim(),
        shelves: shelves.trim(),
        capacity: capacity ? Number(capacity) : undefined,
      },
      editingId,
    ),
  );
  const [page, setPage] = useState(1);
  const products = useQuery({
    queryKey: ['catalogue', scope, 'location', selected?.id, settled, page, assign, productFilter],
    queryFn: ({ signal }) =>
      stockApi.products(
        {
          location_id: assign ? undefined : selected?.id,
          search: settled,
          page,
          filter: productFilter,
        },
        signal,
      ),
    enabled: !!selected,
  });
  async function save() {
    try {
      await add.mutateAsync(undefined);
      setCreate(false);
      setName('');
      setDescription('');
      if (editingId) {
        const refreshed = await query.refetch();
        setSelected(refreshed.data?.find((l) => l.id === editingId));
      }
      setEditingId(undefined);
    } catch (e) {
      setError(e);
    }
  }
  if (printing && selected)
    return (
      <Suspense fallback={<AppText>Préparation de l’étiquette…</AppText>}>
        <LocationLabel location={selected} onClose={() => setPrinting(false)} />
      </Suspense>
    );
  if (locationScanner)
    return (
      <BarcodeFlow
        onClose={() => setLocationScanner(false)}
        onLinked={() => setLocationScanner(false)}
        onScanned={(code) => {
          setLocationScanner(false);
          const location = query.data?.find((l) => locationInfo(l).code === code);
          if (location) {
            setSelected(location);
            setSearch('');
            setPage(1);
          } else {
            setSearch(code);
            setError(new Error('Aucun emplacement ne correspond à ce code.'));
          }
        }}
      />
    );
  if (barcodeProduct)
    return (
      <BarcodeFlow
        target={barcodeProduct}
        canUpdate={canEditBarcode}
        onClose={() => setBarcodeProduct(undefined)}
        onLinked={() => setBarcodeProduct(undefined)}
      />
    );
  if (assignProduct)
    return (
      <LocationSelector
        product={assignProduct}
        initialLocation={selected?.id}
        onClose={() => setAssignProduct(undefined)}
        onSaved={() => {
          setAssignProduct(undefined);
          setAssign(false);
          void query.refetch().then((result) => {
            const updated = result.data?.find((l) => l.id === selected?.id);
            if (updated) setSelected(updated);
          });
        }}
      />
    );
  if (assign)
    return (
      <StockPage title="Affecter un produit au rayon" onClose={() => setAssign(false)}>
        <SNote>Choisissez le produit à affecter à {selected?.name}.</SNote>
        <SSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Rechercher le produit à affecter…"
        />
        {products.data?.data.map((p) => (
          <SButton key={p.id} label={p.productName} secondary onPress={() => setAssignProduct(p)} />
        ))}
        {products.data && products.data.last_page > 1 ? (
          <View style={st.row}>
            <SButton
              label="Précédent"
              secondary
              disabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
            />
            <SButton
              label="Suivant"
              secondary
              disabled={page >= products.data.last_page}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        ) : null}
        {products.isError ? <ErrorState error={products.error} /> : null}
      </StockPage>
    );
  if (create)
    return (
      <StockPage
        title={editingId ? 'Modifier l’emplacement' : 'Créer un emplacement'}
        onClose={() => setCreate(false)}
        footer={
          <View style={st.row}>
            <View style={st.grow}>
              <SButton label="Annuler" secondary onPress={() => setCreate(false)} />
            </View>
            <View style={st.grow}>
              <SButton
                label="Enregistrer l’emplacement"
                icon="save"
                disabled={!name.trim()}
                busy={add.isPending}
                onPress={() => void save()}
              />
            </View>
          </View>
        }
      >
        <SCard>
          <SField label="Nom du rayon ou meuble" value={name} onChange={setName} />
          <AppText variant="labelMd">Zone de l’officine</AppText>
          <STabs
            values={locationZones.filter(([key]) => key !== 'all')}
            value={formZone}
            onChange={setFormZone}
          />
          <SField label="Identifiant / Code" value={code} onChange={setCode} />
          <SField label="Détails étagères / Bacs" value={shelves} onChange={setShelves} />
          <SField
            label="Capacité maximale en unités (optionnel)"
            value={capacity}
            onChange={setCapacity}
            numeric
          />
          <SField label="Description" value={description} onChange={setDescription} multiline />
        </SCard>
        {error ? <ErrorState error={error} /> : null}
      </StockPage>
    );
  return (
    <StockPage
      title={selected ? 'Détail d’un emplacement' : 'Liste des emplacements physiques'}
      onClose={() => {
        if (selected) {
          setSelected(undefined);
          setSearch('');
        } else onClose();
      }}
      footer={
        selected && (canCount || canManage) ? (
          <View style={{ gap: 8 }}>
            {canCount ? (
              <SButton
                label="Lancer un inventaire de ce rayon"
                icon="inventory-2"
                teal
                onPress={() => onInventory(selected)}
              />
            ) : null}
            {canManage ? (
              <SButton
                label="Affecter un nouveau produit ici"
                icon="add"
                onPress={() => {
                  setAssign(true);
                  setSearch('');
                  setPage(1);
                }}
              />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {selected ? (
        <>
          <SCard>
            <View style={st.row}>
              <SBadge label={locationInfo(selected).code || 'EMPLACEMENT ACTIF'} tone="teal" />
              <AppText variant="labelSm" color="outline" style={st.grow}>
                {locationInfo(selected).label}
              </AppText>
              {canManage ? (
                <SButton
                  label="Modifier"
                  icon="edit-note"
                  secondary
                  compact
                  onPress={() => {
                    const m = locationInfo(selected);
                    setEditingId(selected.id);
                    setName(selected.name);
                    setDescription(selected.description || '');
                    setFormZone(m.zone);
                    setCode(m.code || '');
                    setShelves(m.shelves || '');
                    setCapacity(m.capacity ? String(m.capacity) : '');
                    setCreate(true);
                  }}
                />
              ) : null}
            </View>
            <AppText variant="headlineLg">{selected.name}</AppText>
            <SButton
              label={
                locationInfo(selected).code
                  ? `Étiquette QR · ${locationInfo(selected).code}`
                  : 'Étiquette QR · code non renseigné'
              }
              icon="qr-code-2"
              secondary
              compact
              disabled={!locationInfo(selected).code}
              onPress={() => setPrinting(true)}
            />
            <AppText variant="headlineSm" color="outline">
              {locationInfo(selected).shelves || selected.description || 'Détails non renseignés'}
            </AppText>
            <View style={st.row}>
              <Icon name="storefront" color="primary" size={18} />
              <AppText variant="bodySm" color="outline">
                {selected.description || 'Emplacement de l’établissement actif'}
              </AppText>
            </View>
            <View style={st.row}>
              <View style={st.metric}>
                <View style={st.row}>
                  <Icon name="thermostat" color="secondary" size={20} />
                  <AppText variant="headlineMd">
                    {locationInfo(selected).temperature ?? '—'} °C
                  </AppText>
                </View>
                <AppText variant="labelSm" color="outline">
                  {locationInfo(selected).temperature_at
                    ? 'Relevé ' + locationInfo(selected).temperature_at
                    : 'Température non renseignée'}
                </AppText>
              </View>
              <View style={st.metric}>
                <View style={st.row}>
                  <Icon name="inventory-2" color="primary" size={20} />
                  <AppText variant="headlineMd">
                    {selected.quantity} / {locationInfo(selected).capacity ?? '—'}
                  </AppText>
                </View>
                <AppText variant="labelSm" color="outline">
                  {locationInfo(selected).occupancy === undefined
                    ? 'Capacité non renseignée'
                    : locationInfo(selected).occupancy + '% capacité'}
                </AppText>
              </View>
            </View>
            <View style={st.row}>
              <View style={st.grow}>
                <AppText variant="bodySm" color="outline">
                  Charge volumétrique
                </AppText>
                <AppText variant="labelMd">{selected.products} références actives</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="bodySm" color="outline">
                  Valeur marchande
                </AppText>
                <AppText variant="headlineMd" color="primary">
                  {selected.stock_value === undefined ? '—' : money(selected.stock_value)} DH
                </AppText>
              </View>
            </View>
          </SCard>
          <SSearch
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Filtrer les produits de ce rayon…"
          />
          <STabs
            values={[
              ['all', 'Tous'],
              ['available', 'Stock normal'],
              ['low', 'Stock faible'],
              ['missing', 'Sans code-barres'],
            ]}
            value={productFilter}
            onChange={(v) => {
              setProductFilter(v);
              setPage(1);
            }}
          />
          <SHeading
            title="Produits en rayon"
            icon="medication"
            aside={
              <AppText variant="labelSm" color="outline">
                {products.data?.data.length || 0} sur {products.data?.total || 0} affichés
              </AppText>
            }
          />
          {products.data?.data.map((p) => (
            <LocationProductCard
              key={p.id}
              product={p}
              onPress={() => onProduct(p)}
              onAssociate={canEditBarcode ? () => setBarcodeProduct(p) : undefined}
            />
          ))}
          {products.isError ? <ErrorState error={products.error} /> : null}
          {products.data?.data.length === 0 ? (
            <SNote>Aucun produit disponible dans cet emplacement.</SNote>
          ) : null}
          {(products.data?.last_page || 1) > 1 ? (
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
                {page} / {products.data?.last_page || 1}
              </AppText>
              <View style={st.grow}>
                <SButton
                  label="Suivant"
                  secondary
                  disabled={page >= (products.data?.last_page || 1)}
                  onPress={() => setPage((p) => p + 1)}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <StockScopeBanner />
          <View style={st.row}>
            <View style={st.grow}>
              <AppText variant="headlineLg">Emplacements & rayonnage</AppText>
              <AppText variant="bodySm" color="outline">
                Organisez vos produits dans les étagères et zones de stockage.
              </AppText>
            </View>
            {canManage ? (
              <SButton
                label="Nouvel emplacement"
                icon="add"
                compact
                onPress={() => {
                  setEditingId(undefined);
                  setName('');
                  setDescription('');
                  setCode('');
                  setShelves('');
                  setCapacity('');
                  setFormZone('otc');
                  setCreate(true);
                }}
              />
            ) : null}
          </View>
          <SSearch
            value={search}
            onChange={setSearch}
            placeholder="Rayon, zone, étagère ou compartiment…"
            onScan={() => setLocationScanner(true)}
          />
          {query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : null}
          <STabs
            values={locationZones.map(([key, label]) => [
              key,
              `${label} ${query.data?.filter((l) => key === 'all' || locationInfo(l).zone === key).length || 0}`,
            ])}
            value={zone}
            onChange={setZone}
          />
          {query.data
            ?.filter(
              (l) =>
                (zone === 'all' || locationInfo(l).zone === zone) &&
                (l.name + ' ' + l.description + ' ' + locationInfo(l).code)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((l) => (
              <LocationCard
                key={l.id}
                location={l}
                onPress={() => {
                  setSelected(l);
                  setSearch('');
                  setPage(1);
                  setProductFilter('all');
                }}
              />
            ))}
          {query.data?.length === 0 ? (
            <SNote>Aucun emplacement configuré pour cet établissement.</SNote>
          ) : null}
          {error ? <ErrorState error={error} /> : null}
        </>
      )}
    </StockPage>
  );
}
