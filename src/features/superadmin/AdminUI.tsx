import { PageHeader } from '@/components/navigation/PageHeader';
import { useContext, useState, type ReactNode } from 'react';
import { AccessWorkspaceContext } from './AccessWorkspaceContext';
import { StyleSheet, View, type ListRenderItem } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { TextField } from '@/components/ui/TextField';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { normalizeApiError } from '@/services/api/apiError';
import { ExpirationDateField } from '@/features/stores/components/ExpirationDateField';
import type { Page } from './api';
import { ResponsiveList } from '@/components/ui/ResponsiveGrid';
export { Button, AppText, TextField };
export const sa = StyleSheet.create({
  stack: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  inset: { backgroundColor: '#eff4ff', borderRadius: 8, padding: 12, gap: 8 },
  heading: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderColor: '#edf0f8',
    minHeight: 56,
  },
  grow: { flex: 1, minWidth: 0 },
});
export function AdminHeader({ title, back = true }: { title: string; back?: boolean }) {
  return (
    <PageHeader
      title={title}
      onBack={
        back ? () => (router.canGoBack() ? router.back() : router.replace('/home')) : undefined
      }
    />
  );
}
export function AdminScreen({
  title,
  children,
  scroll = true,
  back = true,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
  back?: boolean;
}) {
  const embedded = useContext(AccessWorkspaceContext);
  return (
    <Screen
      scroll={scroll}
      edges={embedded ? [] : ['top']}
      header={embedded ? undefined : <AdminHeader title={title} back={back} />}
      innerStyle={{ maxWidth: '100%' }}
      contentStyle={scroll ? undefined : { padding: 0, paddingBottom: 0 }}
    >
      <View style={[{ flex: 1, width: '100%' }, sa.stack]}>{children}</View>
    </Screen>
  );
}
export function Tag({ label, danger = false }: { label: string; danger?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: danger ? '#ffdad6' : '#c8faf3',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        alignSelf: 'flex-start',
        maxWidth: '100%',
      }}
    >
      <AppText variant="labelSm" style={{ color: danger ? '#93000a' : '#00504a' }}>
        {label}
      </AppText>
    </View>
  );
}
export function Panel({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <View style={sa.card}>
      {title ? (
        <View style={sa.row}>
          {icon ? <Icon name={icon} color="primary" size={21} /> : null}
          <AppText variant="headlineSm" style={sa.grow}>
            {title}
          </AppText>
        </View>
      ) : null}
      {children}
    </View>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <View style={sa.inset}>
      <AppText variant="bodySm" color="onSurfaceVariant">
        {children}
      </AppText>
    </View>
  );
}
export function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: unknown;
  hint?: string;
  icon?: IconName;
}) {
  return (
    <View
      style={[
        sa.card,
        { flexGrow: 1, flexBasis: '45%', minWidth: 120, minHeight: 112, padding: 12, gap: 8 },
      ]}
    >
      <View style={[sa.row, { alignItems: 'flex-start' }]}>
        <AppText variant="bodySm" color="onSurfaceVariant" style={[sa.grow, { fontSize: 11 }]}>
          {label}
        </AppText>
        {icon ? (
          <View style={{ padding: 4, borderRadius: 6, backgroundColor: '#dce9ff' }}>
            <Icon name={icon} size={18} color="primary" />
          </View>
        ) : null}
      </View>
      <AppText variant="dataMetric" color="primary">
        {value == null ? '—' : String(value)}
      </AppText>
      {hint ? (
        <AppText variant="labelSm" color="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
export function Pair({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={[sa.row, { alignItems: 'flex-start' }]}>
      <AppText variant="bodySm" color="outline" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="labelMd" style={{ flex: 1, textAlign: 'right' }}>
        {value == null ? '—' : String(value)}
      </AppText>
    </View>
  );
}
export const currency = (value: unknown) =>
  value == null
    ? '—'
    : `${Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
export function date(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('fr-FR') : '—';
}
export function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <ExpirationDateField
      label={label}
      value={value}
      onChange={onChange}
      placeholder="Choisir une date"
      locale="fr"
      doneLabel="Valider"
    />
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  return (
    <>
      <Button
        variant="tonal"
        label={`${label} : ${options.find(([key]) => key === value)?.[1] ?? 'Choisir'}`}
        trailingIcon="expand-more"
        onPress={() => setOpen(true)}
      />
      <SelectionDialog visible={open} title={label} onClose={() => setOpen(false)}>
        <TextField label="Rechercher" value={search} onChangeText={setSearch} />
        {options
          .filter(([, name]) => name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
          .slice(0, 100)
          .map(([key, name]) => (
            <Button
              key={key}
              label={name}
              variant={key === value ? 'primary' : 'ghost'}
              onPress={() => {
                onChange(key);
                setOpen(false);
                setSearch('');
              }}
            />
          ))}
        {options.length > 100 ? (
          <Note>Affinez la recherche pour retrouver les autres choix.</Note>
        ) : null}
      </SelectionDialog>
    </>
  );
}
export function QueryState({
  query,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
    data?: unknown;
  };
}) {
  if (query.isPending) return <SkeletonCards count={2} />;
  if (
    query.isError &&
    ['forbidden', 'access_denied', 'unauthorized'].includes(normalizeApiError(query.error).kind)
  )
    return (
      <EmptyState
        icon="lock-outline"
        tone="locked"
        title="Accès non autorisé"
        message="Votre compte ne dispose pas des droits nécessaires pour cette page."
        actionLabel="Retour"
        onAction={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
      />
    );
  if (query.isError)
    return (
      <ErrorState
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  return null;
}
export function Pager({
  result,
  setPage,
  busy = false,
}: {
  result?: Page<unknown>;
  setPage: (n: number) => void;
  busy?: boolean;
}) {
  if (!result) return null;
  return (
    <View style={sa.stack}>
      <AppText variant="bodySm" color="outline">
        {result.total} résultats · Page {result.current_page} / {result.last_page}
      </AppText>
      <View style={sa.row}>
        <Button
          label="Précédent"
          variant="tonal"
          style={sa.grow}
          disabled={busy || result.current_page <= 1}
          onPress={() => setPage(result.current_page - 1)}
        />
        <Button
          label="Suivant"
          variant="tonal"
          style={sa.grow}
          disabled={busy || result.current_page >= result.last_page}
          onPress={() => setPage(result.current_page + 1)}
        />
      </View>
    </View>
  );
}
/** One virtualized list per screen. Pages replace data instead of accumulating it indefinitely. */
export function AdminList<T>({
  data,
  renderItem,
  header,
  footer,
  empty,
}: {
  data: T[];
  renderItem: ListRenderItem<T>;
  header?: ReactNode;
  footer?: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <ResponsiveList
      data={data}
      renderItem={renderItem}
      keyExtractor={(row, i) =>
        String(
          (row as { id?: unknown; store_id?: unknown }).id ??
            (row as { store_id?: unknown }).store_id ??
            i,
        )
      }
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      windowSize={5}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
      ListHeaderComponent={<View style={sa.stack}>{header}</View>}
      ListFooterComponent={<View style={sa.stack}>{footer}</View>}
      ListEmptyComponent={<View>{empty}</View>}
    />
  );
}
