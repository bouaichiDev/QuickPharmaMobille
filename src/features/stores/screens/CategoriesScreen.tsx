import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { AppText, useLatinFonts } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, fontFamilies, fontForScript, radii, spacing } from '@/theme';

import { useCategories } from '../useCategories';

type CategoryFilter = 'all' | 'active' | 'inactive';

export function CategoriesScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const latin = useLatinFonts();
  const inputFont = fontForScript(fontFamilies.body, latin);
  const categoriesQuery = useCategories(query.trim());
  const categories = categoriesQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const total = categoriesQuery.data?.pages[0]?.total ?? 0;
  const visibleCategories = categories.filter((category) =>
    filter === 'all' || (filter === 'active' ? category.active === 1 : category.active !== 1),
  );

  function showUnavailableNotice() {
    Alert.alert(
      t('mobile.categories.mutationsUnavailableTitle'),
      t('mobile.categories.mutationsUnavailableMessage'),
    );
  }

  const filterLabels: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: t('mobile.categories.all', { count: total }) },
    { key: 'active', label: t('mobile.categories.active') },
    { key: 'inactive', label: t('mobile.categories.inactive') },
  ];

  return (
    <Screen edges={[]} contentStyle={styles.screenContent}>
      <View style={styles.heading}>
        <AppText variant="headlineLg" accessibilityRole="header">
          {t('mobile.categories.title')}
        </AppText>
        <AppText variant="bodyMd" color="onSurfaceVariant">
          {t('mobile.categories.subtitle')}
        </AppText>
      </View>

      <Button
        label={t('mobile.categories.add')}
        icon="add"
        onPress={showUnavailableNotice}
        style={styles.addButton}
      />

      <View style={styles.tools}>
        <View style={styles.searchField}>
          <Icon name="search" size="md" color="outline" />
          <TextInput
            accessibilityLabel={t('mobile.categories.searchLabel')}
            placeholder={t('mobile.categories.searchPlaceholder')}
            placeholderTextColor={colors.outline}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            style={[styles.searchInput, inputFont]}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          accessibilityRole="tablist"
        >
          {filterLabels.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={filter === item.key}
              onPress={() => setFilter(item.key)}
            />
          ))}
        </ScrollView>
      </View>

      {categoriesQuery.isLoading ? (
        <SkeletonCards count={3} height={176} />
      ) : categoriesQuery.isError ? (
        <Card>
          <ErrorState error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} />
        </Card>
      ) : visibleCategories.length > 0 ? (
        visibleCategories.map((category) => (
          <Card key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryContent}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Icon name="sell" size="md" color="primary" />
                </View>
                <View style={styles.categoryDetails}>
                  <AppText variant="headlineSm">
                    {category.name || t('mobile.categories.untitled')}
                  </AppText>
                  <AppText variant="bodySm" color="onSurfaceVariant">
                    {category.code || t('mobile.categories.codeUnavailable')}
                  </AppText>
                </View>
                <AppText variant="labelMd" color={category.active === 1 ? 'success' : 'outline'}>
                  {category.active === 1
                    ? t('mobile.categories.statusActive')
                    : t('mobile.categories.statusInactive')}
                </AppText>
              </View>
              <View style={styles.actions}>
                <Button
                  label={t('mobile.categories.view')}
                  icon="visibility"
                  variant="outline"
                  compact
                  onPress={showUnavailableNotice}
                  style={styles.actionButton}
                />
                <Button
                  label={t('mobile.categories.edit')}
                  icon="edit"
                  variant="tonal"
                  compact
                  onPress={showUnavailableNotice}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </Card>
        ))
      ) : (
        <Card>
          <EmptyState
            icon={query || filter !== 'all' ? 'search-off' : 'inventory-2'}
            title={
              query || filter !== 'all'
                ? t('mobile.categories.noResultsTitle')
                : t('mobile.categories.emptyTitle')
            }
            message={
              query || filter !== 'all'
                ? t('mobile.categories.noResultsMessage')
                : t('mobile.categories.emptyMessage')
            }
          />
        </Card>
      )}
      {categoriesQuery.hasNextPage ? (
        <Button
          label={t('mobile.categories.loadMore')}
          variant="outline"
          loading={categoriesQuery.isFetchingNextPage}
          onPress={() => void categoriesQuery.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.xl,
  },
  heading: {
    gap: spacing.xxs,
  },
  addButton: {
    minHeight: 58,
  },
  tools: {
    gap: spacing.lg,
  },
  searchField: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.onSurface,
    textAlign: 'auto',
  },
  filters: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  categoryCard: {
    padding: 0,
  },
  categoryContent: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.primaryFixed,
  },
  categoryDetails: {
    flex: 1,
    gap: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
