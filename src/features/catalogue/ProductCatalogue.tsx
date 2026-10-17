import { ProductInventory } from './ProductInventory';
import { canAssociateBarcode } from './stockApi';
import { useStockApi, StockContext } from './StockContext';

import { useContext, useState, useRef } from 'react';

import {
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { Tabs, useRouter, useLocalSearchParams } from 'expo-router';

import { useQuery } from '@tanstack/react-query';

import { AppText } from '@/components/ui/AppText';

import { Icon } from '@/components/ui/Icon';

import { Screen } from '@/components/ui/Screen';

import { ErrorState } from '@/components/feedback/ErrorState';

import { useAccess } from '@/features/access/useAccess';

import { can } from '@/features/crm/modules';

import { useCategories } from '@/features/stores/useCategories';

import { productCode, type StockProduct, type StockLocation } from './stockApi';

import { useStockScope } from './useStock';

import { ProductDetailContent, ProductDetailActions } from './ProductDetail';

import { BarcodeDisplay, BarcodeFlow } from './BarcodeFlow';

import { LocationsView, LocationSelector } from './LocationsView';

import { InventoryView } from './InventoryView';
import { StockProductCard } from './StockProductCard';
import { StockHeader } from './StockHeader';
import { TabletStockDetail } from './TabletStockDetail';

import {
  SBadge,
  SButton,
  SNote,
  SSearch,
  STabs,
  StockPage,
  st,
  useDebounce,
  money,
} from './StockDesign';

export function ProductCatalogue() {
  const { category_id } = useLocalSearchParams<{ category_id?: string }>();
  return <ProductCatalogueContent key={category_id || 'all'} />;
}
function ProductCatalogueContent() {
  const stockApi = useStockApi();
  const searchRef = useRef<TextInput>(null);

  const router = useRouter();
  const { panel, category_id } = useLocalSearchParams<{ panel?: string; category_id?: string }>();

  const actualAccess = useAccess();

  const preview = useContext(StockContext);

  const access = preview ? { data: preview.access, isLoading: false } : actualAccess;

  const scope = useStockScope();

  const { width } = useWindowDimensions();

  const split = width >= 768;

  const columns = width >= 600 && !split ? 2 : 1;

  const [search, setSearch] = useState('');

  const settled = useDebounce(search);

  const [filter, setFilter] = useState('all');

  const [category, setCategory] = useState<number | null>(() => {
    const id = Number(category_id);
    return Number.isInteger(id) && id > 0 ? id : null;
  });

  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [evenSplit, setEvenSplit] = useState(false);
  const [locationFilter, setLocationFilter] = useState<number>();

  const [selected, setSelected] = useState<number>();
  const [productInventory, setProductInventory] = useState<StockProduct>();

  const [scanner, setScanner] = useState<{ target?: StockProduct } | null>(null);

  const [barcode, setBarcode] = useState<StockProduct>();

  const [place, setPlace] = useState<StockProduct>();

  const [locations, setLocations] = useState(false);

  const [inventory, setInventory] = useState<{ location?: StockLocation } | null>(null);

  const allowed = can(access.data, 'products.view');

  const canEdit = can(access.data, 'products.update');

  const canPlace = can(access.data, 'stock.locations.manage');

  const canCount = can(access.data, 'stock.adjust');

  const canStock = can(access.data, 'stock.view');

  const canCost = can(access.data, 'products.view_purchase_price');

  const categories = useCategories('');

  const query = useQuery({
    queryKey: ['catalogue', scope, { settled, filter, category, page, locationFilter }],

    queryFn: ({ signal }) =>
      stockApi.products(
        {
          search: settled,
          filter,
          category_id: category || undefined,
          page,
          location_id: locationFilter,
        },

        signal,
      ),

    enabled: !!scope && allowed,

    staleTime: 30000,
  });

  const shelfQuery = useQuery({
    queryKey: ['stock-locations', scope],
    queryFn: () => stockApi.locations(),
    enabled: !!scope && allowed && split,
    staleTime: 60000,
  });

  const detailId = selected ?? (split ? query.data?.data[0]?.id : undefined);

  const openDetail = (p: StockProduct) => setSelected(p.id);

  const openBarcode = (p: StockProduct, edit = false) => {
    if (edit) setScanner({ target: p });
    else setBarcode(p);
  };

  const edit = (p: StockProduct) => router.push({ pathname: '/add-product', params: { id: p.id } });

  const detailProps = {
    canEdit,

    canPlace,

    canCost,

    onBarcode: openBarcode,

    onPlace: setPlace,

    onEdit: edit,
  };

  const heading = split ? (
    <View style={{ gap: 8, paddingBottom: 8 }}>
      <SSearch
        inputRef={searchRef}
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Rechercher un produit…"
        onScan={() => setScanner({})}
      />
      <STabs
        values={[
          ['all', `Tous (${query.data?.counts?.all ?? query.data?.total ?? 0})`],
          ...(shelfQuery.data || []).map(
            (l) =>
              [String(l.id), `${l.name.split(/[—–]/)[0]?.trim()} (${l.products})`] as [
                string,
                string,
              ],
          ),
        ]}
        value={locationFilter ? String(locationFilter) : 'all'}
        onChange={(v) => {
          setLocationFilter(v === 'all' ? undefined : Number(v));
          setPage(1);
          setSelected(undefined);
        }}
      />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
    </View>
  ) : (
    <View style={{ gap: 12, paddingBottom: 14 }}>
      <View style={st.row}>
        <AppText variant="headlineMd" style={st.grow}>
          Catalogue & Stock
        </AppText>

        <SBadge label={`${query.data?.total ?? 0} réf.`} />

        {can(access.data, 'products.create') ? (
          <SButton
            label="Ajouter"

            icon="add"

            compact

            onPress={() => router.push('/add-product')}
          />
        ) : null}
      </View>

      <SSearch
        inputRef={searchRef}
        value={search}

        onChange={(v) => {
          setSearch(v);

          setPage(1);
        }}

        placeholder="Rechercher nom, CIP, EAN, code…"

        onScan={() => setScanner({})}
      />

      <STabs
        values={[
          ['all', `Toutes ${query.data?.counts?.all ?? query.data?.total ?? 0}`],

          ['available', `Disponibles ${query.data?.counts?.available ?? ''}`],

          ['low', `Stock faible ${query.data?.counts?.low ?? ''}`],

          ['missing', `Sans code-barres ${query.data?.counts?.missing ?? ''}`],
          ['parapharmacy', `Parapharmacie ${query.data?.counts?.parapharmacy ?? ''}`],
          ['locations', 'Emplacements ⌄'],
        ]}

        value={filter}

        onChange={(v) => {
          setFilter(v);

          setPage(1);
        }}
      />

      <View style={[st.row, { padding: 10, borderRadius: 8, backgroundColor: '#e5eeff' }]}>
        <Icon name="notification-important" color="secondary" size={17} />
        <AppText variant="labelSm" style={st.grow} color="primary">
          {category
            ? categories.data?.pages.flatMap((p) => p.data).find((c) => c.id === category)?.name
            : `${query.data?.counts?.low ?? 0} faibles • ${query.data?.counts?.missing ?? 0} non appairés`}
        </AppText>
        <SButton
          label="Filtrer"
          secondary
          compact
          icon="filter-list"
          onPress={() => setCategoriesOpen(true)}
        />
      </View>
      {access.isLoading ? (
        <AppText>Chargement des permissions…</AppText>
      ) : !allowed ? (
        <SNote error>Votre rôle ne permet pas de consulter les produits.</SNote>
      ) : null}

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
    </View>
  );

  function renderProduct(p: StockProduct) {
    if (split)
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Détail du produit ${p.productName}`}
          onPress={() => openDetail(p)}
          style={[
            st.card,
            {
              marginBottom: 8,
              padding: 12,
              gap: 4,
              borderLeftWidth: detailId === p.id ? 6 : 1,
              borderLeftColor: detailId === p.id ? '#006a63' : '#e5eeff',
            },
          ]}
        >
          <View style={st.row}>
            <AppText variant="headlineSm" color="primary" style={st.grow}>
              {p.productName}
              {detailId === p.id ? ' ✓' : ''}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Inventaire de ${p.productName}`}
              accessibilityState={{ disabled: !canStock }}
              disabled={!canStock}
              onPress={(event) => {
                event.stopPropagation();
                setProductInventory(p);
              }}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canStock ? 1 : 0.4,
              }}
            >
              <Icon name="inventory-2" color="primary" size={22} />
            </Pressable>
            <AppText variant="labelLg" color="primary">
              {money(p.sellingPrice)} DH
            </AppText>
          </View>
          <View style={st.row}>
            <AppText variant="bodySm" color="primary" numberOfLines={1} style={st.grow}>
              {p.description || p.categoryName || 'Produit du catalogue'}
            </AppText>
            <AppText
              variant="labelSm"
              color={
                detailId === p.id
                  ? 'secondary'
                  : Number(p.quantity) <= Number(p.minQuantity)
                    ? 'error'
                    : 'outline'
              }
            >
              {detailId === p.id
                ? 'Sélectionné'
                : p.requires_prescription
                  ? 'Ord. requise'
                  : Number(p.quantity) <= Number(p.minQuantity)
                    ? 'Réassort'
                    : 'Libre accès'}
            </AppText>
          </View>
          <View style={st.row}>
            <SBadge label={p.locationName || 'Non affecté'} />
            {productCode(p) ? (
              <SBadge label={`${p.quantity} unités`} tone="teal" />
            ) : (
              <SBadge label="Sans code-barres" tone="grey" />
            )}
          </View>
        </Pressable>
      );

    return (
      <View style={{ flex: 1, marginBottom: 12, marginRight: columns > 1 ? 10 : 0 }}>
        <StockProductCard
          product={p}
          selected={split && detailId === p.id}
          onInventory={canStock ? () => setProductInventory(p) : undefined}
          onDetail={() => openDetail(p)}
          onBarcode={() => setBarcode(p)}
          onAssociate={canEdit ? () => setScanner({ target: p }) : undefined}
        />
      </View>
    );
  }

  return (
    <>
      {!preview ? <Tabs.Screen options={{ headerShown: false }} /> : null}
      <Screen edges={[]} scroll={false} contentStyle={{ padding: 0, paddingBottom: 0, gap: 0 }}>
        <StockHeader onSearch={() => searchRef.current?.focus()} onScan={() => setScanner({})} />
        {split ? (
          <View
            style={[
              st.row,
              {
                marginHorizontal: 16,
                marginTop: 4,
                marginBottom: 8,
                padding: 8,
                backgroundColor: '#eff4ff',
                borderRadius: 12,
              },
            ]}
          >
            <View style={{ padding: 8, borderRadius: 8, backgroundColor: '#e5eeff' }}>
              <Icon name="point-of-sale" color="primary" size={24} />
            </View>
            <View style={st.grow}>
              <View style={st.row}>
                <AppText variant="headlineSm" color="primary">
                  Comptoir Tablette
                </AppText>
                <SBadge label="Split-view" tone="teal" />
              </View>
              <AppText variant="bodySm" color="primary">
                Volet synchronisé officine · Grand écran tactile
              </AppText>
            </View>
            {can(access.data, 'products.create') ? (
              <SButton
                label="Ajouter"
                compact
                secondary
                icon="add"
                onPress={() => router.push('/add-product')}
              />
            ) : null}
            <SButton
              label="50/50"
              compact
              secondary={evenSplit}
              icon="view-column"
              onPress={() => setEvenSplit(true)}
            />
            <SButton
              label="Large"
              compact
              secondary={!evenSplit}
              icon="view-week"
              onPress={() => setEvenSplit(false)}
            />
          </View>
        ) : null}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: split ? 16 : 0,
            gap: split ? 8 : 0,
          }}
        >
          <View style={{ flex: split ? (evenSplit ? 6 : 5) : 1, minWidth: 0 }}>
            <FlatList
              key={`catalogue-${columns}`}

              data={query.data?.data || []}

              numColumns={columns}

              keyExtractor={(p) => String(p.id)}

              renderItem={({ item }) => renderProduct(item)}

              ListHeaderComponent={heading}

              contentContainerStyle={{
                paddingHorizontal: split ? 0 : 16,
                paddingTop: split ? 0 : 16,
                paddingBottom: 20,
              }}

              keyboardShouldPersistTaps="handled"

              initialNumToRender={8}

              maxToRenderPerBatch={8}

              windowSize={5}

              refreshing={query.isRefetching}

              onRefresh={() => void query.refetch()}

              ListEmptyComponent={
                query.isLoading ? (
                  <AppText>Chargement des produits…</AppText>
                ) : allowed && !query.isError ? (
                  <SNote>Aucun produit trouvé. Modifiez la recherche ou les filtres.</SNote>
                ) : null
              }

              ListFooterComponent={
                (query.data?.last_page || 1) > 1 ? (
                  <View style={[st.row, { paddingVertical: 8 }]}>
                    <View style={st.grow}>
                      <SButton
                        label="Précédent"

                        compact

                        secondary

                        disabled={page === 1 || query.isFetching}

                        onPress={() => setPage((p) => p - 1)}
                      />
                    </View>

                    <AppText variant="bodySm">
                      {page} / {query.data?.last_page || 1}
                    </AppText>

                    <View style={st.grow}>
                      <SButton
                        label="Suivant"

                        compact

                        secondary

                        disabled={page >= (query.data?.last_page || 1) || query.isFetching}

                        onPress={() => setPage((p) => p + 1)}
                      />
                    </View>
                  </View>
                ) : null
              }
            />

            {!split ? (
              <View
                style={[
                  st.row,

                  {
                    padding: 12,

                    borderTopWidth: 1,

                    borderColor: '#e5eeff',

                    backgroundColor: '#f8f9ff',
                  },
                ]}
              >
                {canStock ? (
                  <View style={st.grow}>
                    <SButton
                      label="Lancer un inventaire"

                      secondary

                      icon="inventory-2"

                      onPress={() => setInventory({})}
                    />
                  </View>
                ) : null}

                <View style={st.grow}>
                  <SButton
                    label="Scanner produit"

                    teal

                    icon="qr-code-scanner"

                    onPress={() => setScanner({})}

                    disabled={!allowed}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {split ? (
            <View style={{ flex: evenSplit ? 6 : 7, minWidth: 0 }}>
              <ScrollView
                style={{ flex: 1 }}

                contentContainerStyle={{ paddingBottom: 16 }}

                keyboardShouldPersistTaps="handled"
              >
                {detailId ? (
                  <TabletStockDetail
                    key={detailId}
                    id={detailId}
                    {...detailProps}
                    canWithdraw={canCount}
                  />
                ) : (
                  <SNote>Sélectionnez un produit pour consulter sa fiche.</SNote>
                )}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Screen>

      {productInventory ? (
        <ProductInventory
          product={productInventory}
          onClose={() => setProductInventory(undefined)}
          onPlace={canPlace ? setPlace : undefined}
          onDetail={() => {
            openDetail(productInventory);
            setProductInventory(undefined);
          }}
        />
      ) : null}
      {!split && selected ? (
        <StockPage
          title="Détail Médicament"
          onClose={() => setSelected(undefined)}
          footer={<ProductDetailActions id={selected} {...detailProps} />}
        >
          <ProductDetailContent id={selected} {...detailProps} />
        </StockPage>
      ) : null}

      {barcode ? (
        <BarcodeDisplay
          product={barcode}
          editable={canEdit && canAssociateBarcode(barcode)}

          onClose={() => setBarcode(undefined)}

          onEdit={() => {
            setScanner({ target: barcode });

            setBarcode(undefined);
          }}
        />
      ) : null}

      {scanner ? (
        <BarcodeFlow
          target={scanner.target}

          canUpdate={canEdit}

          onClose={() => setScanner(null)}

          onLinked={(p) => {
            setScanner(null);

            setSelected(p.id);
          }}
        />
      ) : null}

      {place ? (
        <LocationSelector
          product={place}

          onClose={() => setPlace(undefined)}

          onSaved={() => setPlace(undefined)}
        />
      ) : null}

      {locations || panel === 'locations' ? (
        <LocationsView
          onClose={() => {
            if (panel === 'locations' && access.data?.role.code === 'SuperAdmin') {
              if (router.canGoBack()) router.back();
              else router.replace('/home');
              return;
            }
            setLocations(false);
            router.setParams({ panel: undefined });
          }}

          canManage={canPlace}
          canEditBarcode={canEdit}

          canCount={canCount}

          onProduct={(p) => {
            setLocations(false);
            router.setParams({ panel: undefined });

            setSelected(p.id);
          }}

          onInventory={(l) => {
            setLocations(false);
            router.setParams({ panel: undefined });

            setInventory({ location: l });
          }}
        />
      ) : null}

      {inventory || panel === 'inventory' ? (
        <InventoryView
          location={inventory?.location}

          canAdjust={canCount}

          onClose={() => {
            setInventory(null);
            router.setParams({ panel: undefined });
          }}
        />
      ) : null}

      {categoriesOpen ? (
        <StockPage title="Catégories de produits" onClose={() => setCategoriesOpen(false)}>
          <SButton
            label="Toutes les catégories"

            secondary

            onPress={() => {
              setCategory(null);

              setPage(1);

              setCategoriesOpen(false);
            }}
          />

          {categories.data?.pages

            .flatMap((p) => p.data)

            .map((c) => (
              <SButton
                key={c.id}

                label={c.name || 'Catégorie'}

                secondary={category !== c.id}

                onPress={() => {
                  setCategory(c.id);

                  setPage(1);

                  setCategoriesOpen(false);
                }}
              />
            ))}

          {categories.hasNextPage ? (
            <SButton
              label="Charger d’autres catégories"

              secondary

              busy={categories.isFetchingNextPage}

              onPress={() => void categories.fetchNextPage()}
            />
          ) : null}
        </StockPage>
      ) : null}
    </>
  );
}
