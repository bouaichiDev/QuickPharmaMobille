import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { AppText, useLatinFonts } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useCategories } from '@/features/stores/useCategories';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { useProducts } from '@/features/stores/useProducts';
import { colors, fontFamilies, fontForScript, radii, spacing } from '@/theme';
import { formatNumber } from '@/utils/format';

import { ProductCard } from '../components/ProductCard';

type ActiveFilter = 'all' | 'active' | 'inactive';

export function ProductsScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const latin = useLatinFonts();
  const currency = useCurrency();
  const [search, setSearch] = useState('');
  const [settledSearch, setSettledSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [lowStock, setLowStock] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const inputFont = fontForScript(fontFamilies.body, latin);

  useEffect(() => {
    const timeout = setTimeout(() => setSettledSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const categoriesQuery = useCategories('');
  const categories = categoriesQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const productQuery = useProducts({
    search: settledSearch,
    categoryId,
    active: activeFilter === 'all' ? null : activeFilter === 'active' ? '1' : '0',
    expiringSoon,
    lowStock,
  });
  const products = productQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const productTotal = productQuery.data?.pages[0]?.meta.total ?? 0;

  const filters = [
    { key: 'all' as const, label: t('mobile.products.allStatus') },
    { key: 'active' as const, label: t('mobile.products.active') },
    { key: 'inactive' as const, label: t('mobile.products.inactive') },
  ];

  function openCategories() {
    router.push('/categories');
  }

  const selectedCategoryLabel = selectedCategory?.name ?? t('mobile.products.allCategories');

  return (
    <Screen edges={[]} contentStyle={styles.screenContent}>
      <View style={styles.overview}>
        <View style={styles.overviewTop}>
          <View style={styles.overviewCopy}>
            <AppText variant="labelSm" color="onPrimaryContainer" uppercase>
              {t('mobile.products.inventoryLabel')}
            </AppText>
            <AppText variant="headlineLg" color="onPrimary">
              {t('mobile.products.title')}
            </AppText>
            <AppText variant="bodySm" color="onPrimaryContainer">
              {t('mobile.products.subtitle')}
            </AppText>
          </View>
          <View style={styles.totalBadge}>
            <Icon name="inventory-2" size="sm" color="onPrimary" />
            <AppText variant="labelSm" color="onPrimary">
              {t('mobile.products.total', { count: formatNumber(productTotal, locale) })}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('mobile.products.add')}
          icon="add-circle-outline"
          onPress={() => router.push('/add-product')}
          style={styles.addButton}
        />
        <Button
          label={t('mobile.products.categories')}
          icon="category"
          variant="outline"
          onPress={openCategories}
          style={styles.categoriesButton}
        />
      </View>

      <View style={styles.searchField}>
        <Icon name="search" size="md" color="outline" />
        <TextInput
          accessibilityLabel={t('mobile.products.searchLabel')}
          placeholder={t('mobile.products.searchPlaceholder')}
          placeholderTextColor={colors.outline}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          style={[styles.searchInput, inputFont]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setCategorySheetOpen(true)}
          style={styles.categoryFilter}
        >
          <Icon name="grid-view" size="sm" color="onSurfaceVariant" />
          <AppText variant="labelSm" numberOfLines={1} style={styles.categoryFilterText}>
            {selectedCategoryLabel}
          </AppText>
          <Icon name="arrow-drop-down" size="sm" color="onSurfaceVariant" />
        </Pressable>
        <Chip
          label={t('mobile.products.expiringSoon')}
          selected={expiringSoon}
          onPress={() => setExpiringSoon((value) => !value)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mobile.products.lowStock')}
          accessibilityState={{ selected: lowStock }}
          onPress={() => setLowStock((value) => !value)}
          style={[styles.alertFilter, lowStock ? styles.alertFilterSelected : null]}
        >
          <Icon name="warning-amber" size="sm" color={lowStock ? 'onErrorContainer' : 'error'} />
        </Pressable>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusFilters}
      >
        {filters.map((filter) => (
          <Chip
            key={filter.key}
            label={filter.label}
            selected={activeFilter === filter.key}
            onPress={() => setActiveFilter(filter.key)}
          />
        ))}
      </ScrollView>

      {productQuery.isLoading ? (
        <SkeletonCards count={3} height={188} />
      ) : productQuery.isError ? (
        <Card>
          <ErrorState error={productQuery.error} onRetry={() => void productQuery.refetch()} />
        </Card>
      ) : products.length > 0 ? (
        <>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryName={
                categories.find((category) => category.id === product.categoryId)?.name ?? undefined
              }
              currency={currency}
              locale={locale}
              labels={{
                active: t('mobile.products.active'),
                inactive: t('mobile.products.inactive'),
                expiryRequired: t('mobile.products.expiryRequired'),
                noExpiry: t('mobile.products.noExpiry'),
                purchasePrice: t('mobile.products.purchasePrice'),
                sellingPrice: t('mobile.products.sellingPrice'),
                lowStock: t('mobile.products.lowStock'),
                available: t('mobile.products.available'),
                units: t('mobile.products.units'),
              }}
            />
          ))}
          {productQuery.hasNextPage ? (
            <Button
              label={t('mobile.products.loadMore')}
              variant="outline"
              loading={productQuery.isFetchingNextPage}
              onPress={() => void productQuery.fetchNextPage()}
            />
          ) : null}
        </>
      ) : (
        <Card>
          <EmptyState
            icon="inventory-2"
            title={t('mobile.products.emptyTitle')}
            message={t('mobile.products.emptyMessage')}
          />
        </Card>
      )}

      <BottomSheet
        visible={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title={t('mobile.products.chooseCategory')}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCategoryId(null);
            setCategorySheetOpen(false);
          }}
          style={styles.sheetOption}
        >
          <AppText variant="labelMd">{t('mobile.products.allCategories')}</AppText>
          {categoryId === null ? (
            <Badge label={t('mobile.products.selected')} tone="primary" />
          ) : null}
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            onPress={() => {
              setCategoryId(category.id);
              setCategorySheetOpen(false);
            }}
            style={styles.sheetOption}
          >
            <AppText variant="labelMd">
              {category.name ?? t('mobile.products.unnamedCategory')}
            </AppText>
            {categoryId === category.id ? (
              <Badge label={t('mobile.products.selected')} tone="primary" />
            ) : null}
          </Pressable>
        ))}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
  },
  overview: {
    minHeight: 112,
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryContainer,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  overviewCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  totalBadge: {
    maxWidth: 140,
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.brandTeal,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addButton: {
    flex: 1.2,
    paddingHorizontal: spacing.sm,
  },
  categoriesButton: {
    flex: 0.8,
    paddingHorizontal: spacing.sm,
  },
  searchField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'auto',
  },
  filters: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryFilter: {
    height: 40,
    maxWidth: 205,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  categoryFilterText: {
    flex: 1,
  },
  alertFilter: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  alertFilterSelected: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  statusFilters: {
    gap: spacing.sm,
  },
  sheetOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineSoft,
  },
});
