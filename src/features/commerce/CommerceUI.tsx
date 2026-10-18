import { PageHeader } from '@/components/navigation/PageHeader';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ResponsiveGrid, ResponsiveList } from '@/components/ui/ResponsiveGrid';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { itemId, itemName } from '@/features/crm/crmApi';
import { commerceApi, type Row } from './api';
import { useTranslation } from '@/i18n/useTranslation';
import { translatedReference } from './entryDefaults';
export { AppText, Button, TextField, ResponsiveGrid, ErrorState, SkeletonCards, useDebounce };
export { SearchFilterRow } from '@/components/ui/SearchFilterRow';
export const ui = StyleSheet.create({
  stack: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  card: {
    padding: 16,
    borderRadius: 18,
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  inset: { padding: 12, gap: 8, borderRadius: 12, backgroundColor: '#eff4ff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderColor: '#edf0f8',
  },
});
export function useCommerceAccess() {
  const access = useAccess();
  const session = useSessionStore((s) => s.session);
  const readOnly = !!session?.supportAccess || !!access.data?.read_only;
  const can = (permission: string) =>
    !!access.data?.permissions.includes(permission) && (!readOnly || permission.endsWith('.view'));
  return { access, store: session?.activeStore?.id ?? '', readOnly, can };
}
export function CommerceScreen({
  title,
  children,
  scroll = true,
  onBack,
  footer,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
  onBack?: () => void;
  footer?: ReactNode;
}) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !onBack) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => handler.remove();
  }, [focused, onBack]);
  return (
    <Screen
      scroll={scroll}
      keyboard
      footer={
        footer ? (
          <View
            testID="commerce-fixed-footer"
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: '#f8f9ff',
              borderTopWidth: 1,
              borderTopColor: '#edf0f8',
              flexShrink: 0,
            }}
          >
            {footer}
          </View>
        ) : undefined
      }
      innerStyle={{ maxWidth: '100%' }}
      contentStyle={scroll ? { paddingBottom: 24 } : { padding: 0 }}
      header={
        <PageHeader
          title={title}
          onBack={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')))}
        />
      }
    >
      {children}
    </Screen>
  );
}
export function Card({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <View style={ui.card}>
      {title ? (
        <View style={ui.row}>
          {icon ? <Icon name={icon} color="primary" /> : null}
          <AppText variant="headlineSm" style={ui.grow}>
            {title}
          </AppText>
        </View>
      ) : null}
      {children}
    </View>
  );
}
export function Badge({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: danger ? '#ffdad6' : '#b9f7ed',
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <AppText variant="labelSm" style={{ color: danger ? '#93000a' : '#005b53' }}>
        {children}
      </AppText>
    </View>
  );
}
export function Pair({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={ui.row}>
      <AppText variant="bodyMd" color="onSurfaceVariant" style={ui.grow}>
        {label}
      </AppText>
      <AppText variant="labelLg" style={{ flex: 1, textAlign: 'right' }}>
        {value == null || value === '' ? 'Non renseigné' : String(value)}
      </AppText>
    </View>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={ui.inset}>
      <AppText variant="bodySm" color="onSurfaceVariant">
        {children}
      </AppText>
    </View>
  );
}
export function AccessGate({ permission, children }: { permission: string; children: ReactNode }) {
  const { access, can } = useCommerceAccess();
  if (access.isPending) return <SkeletonCards count={2} />;
  if (access.isError)
    return <ErrorState error={access.error} onRetry={() => void access.refetch()} />;
  if (!can(permission))
    return <Notice>Vous n’avez pas accès à cette page avec les droits actuels.</Notice>;
  return children;
}
export function useCommerceList(path: string, filters: Row, permission: string) {
  const { store, can } = useCommerceAccess();
  return useInfiniteQuery({
    queryKey: ['commerce', store, path, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      commerceApi.list(path, { ...filters, page: pageParam }, signal),
    getNextPageParam: (page, all) => (all.length < page.lastPage ? all.length + 1 : undefined),
    enabled: !!store && can(permission),
    staleTime: 60_000,
    retry: false,
  });
}
export function CommerceList({
  query,
  header,
  renderItem,
}: {
  query: ReturnType<typeof useCommerceList>;
  header: ReactNode;
  renderItem: ListRenderItem<Row>;
}) {
  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
  return (
    <ResponsiveList
      data={rows}
      renderItem={renderItem}
      keyExtractor={itemId}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      contentContainerStyle={{ paddingVertical: 16 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={{ gap: 12, marginBottom: 12 }}>{header}</View>}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      ListEmptyComponent={
        query.isPending ? (
          <SkeletonCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <EmptyState
            title="Aucun résultat"
            message="Modifiez les filtres ou ajoutez un premier élément."
          />
        )
      }
      ListFooterComponent={
        <View style={{ paddingVertical: 12, gap: 12 }}>
          {rows.length ? (
            <AppText variant="bodySm" align="center" color="outline">
              {rows.length} sur {query.data?.pages[0]?.total ?? rows.length}
            </AppText>
          ) : null}
          {query.isError && rows.length ? (
            <ErrorState error={query.error} onRetry={() => void query.fetchNextPage()} />
          ) : null}
          {query.hasNextPage ? (
            <Button
              label="Charger les suivants"
              variant="outline"
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null}
        </View>
      }
    />
  );
}
export function ReferenceSelect({
  label,
  value,
  onChange,
  path,
  params = {},
  enabled = true,
}: {
  label: string;
  value: string;
  onChange: (id: string, row: Row) => void;
  path: string;
  params?: Row;
  enabled?: boolean;
}) {
  const { tDynamic } = useTranslation();
  const referenceName = (row: Row) =>
    path.includes('status') || path === '/types/payments'
      ? translatedReference(row, tDynamic)
      : itemName(row);
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(50);
  const term = useDebounce(search),
    { store } = useCommerceAccess();
  const query = useQuery({
    queryKey: ['commerce-reference', store, path, params, term, page],
    queryFn: ({ signal }) =>
      commerceApi.list(path, { ...params, search: term, page, per_page: 50 }, signal),
    enabled: enabled && (open || !!value),
    staleTime: 300_000,
    retry: false,
  });
  const [selected, setSelected] = useState<Row>();
  const rows = query.data?.rows ?? [],
    row =
      rows.find((r) => itemId(r) === value) ??
      (selected && itemId(selected) === value ? selected : undefined);
  return (
    <>
      <AppText variant="labelLg">{label}</AppText>
      <Button
        label={
          row ? referenceName(row) : value ? 'Valeur actuelle sélectionnée' : `Choisir : ${label}`
        }
        variant="tonal"
        trailingIcon="expand-more"
        disabled={!enabled}
        onPress={() => setOpen(true)}
      />
      <SelectionDialog visible={open} title={label} onClose={() => setOpen(false)}>
        <TextField
          label="Rechercher"
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
            setLimit(50);
          }}
        />
        {query.isPending ? (
          <ActivityIndicator />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            {rows
              .filter((r) => !term || referenceName(r).toLowerCase().includes(term.toLowerCase()))
              .slice(0, limit)
              .map((r) => (
                <Button
                  key={itemId(r)}
                  label={referenceName(r)}
                  variant="ghost"
                  onPress={() => {
                    setSelected(r);
                    onChange(itemId(r), r);
                    setOpen(false);
                  }}
                />
              ))}
            {!rows.length ? <Notice>Aucun choix disponible.</Notice> : null}
            {rows.length > limit ? (
              <Button
                label="Afficher davantage"
                variant="tonal"
                onPress={() => setLimit(limit + 50)}
              />
            ) : null}
            {page > 1 ? (
              <Button label="Page précédente" variant="tonal" onPress={() => setPage(page - 1)} />
            ) : null}
            {page < (query.data?.lastPage ?? 1) ? (
              <Button label="Page suivante" variant="tonal" onPress={() => setPage(page + 1)} />
            ) : null}
          </>
        )}
      </SelectionDialog>
    </>
  );
}
