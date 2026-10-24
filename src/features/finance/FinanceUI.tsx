import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon, type IconName } from '@/components/ui/Icon';
import { AppText, Button, useCommerceAccess } from '@/features/admin/AdminDesign';
import { adminApi, type Row } from '@/features/admin/api';
import { financePage } from './model';
export {
  AdminPage,
  Panel,
  AppText,
  Button,
  TextField,
  Notice,
  Tabs,
  Fold,
  design,
  useCommerceAccess,
} from '@/features/admin/AdminDesign';
export { currency, date, DateInput } from '@/features/superadmin/AdminUI';
export { Pair, CommerceList, ReferenceSelect, AccessGate } from '@/features/commerce/CommerceUI';
export const go = (module: string, params: Row = {}) =>
  router.push({ pathname: '/finance/[module]', params: { module, ...params } } as Href);
export function WeekStrip({
  value,
  onChange,
}: {
  value?: string;
  onChange: (day: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return (
    <View style={{ gap: 8 }}>
      <View style={f.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Semaine précédente"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setOffset(offset - 1)}
        >
          <Icon name="chevron-left" />
        </Pressable>
        <AppText style={{ flex: 1, textAlign: 'center' }}>
          {monday.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Semaine suivante"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setOffset(offset + 1)}
        >
          <Icon name="chevron-right" />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const day = new Date(monday);
          day.setDate(day.getDate() + i);
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={day.toLocaleDateString('fr-FR')}
              accessibilityState={{ selected: value === key }}
              onPress={() => onChange(value === key ? '' : key)}
              style={{
                flex: 1,
                minHeight: 52,
                justifyContent: 'center',
                alignItems: 'center',
                gap: 3,
                borderRadius: 8,
                backgroundColor: value === key ? '#01509d' : '#eff4ff',
              }}
            >
              <AppText variant="bodySm" style={{ color: value === key ? '#fff' : '#64748b' }}>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}
              </AppText>
              <AppText variant="labelLg" style={{ color: value === key ? '#fff' : '#01509d' }}>
                {day.getDate()}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function useFinanceQuery(path: string, params: Row, permission: string, enabled = true) {
  const { store, can } = useCommerceAccess();
  return useQuery({
    queryKey: ['admin', store, path, params],
    queryFn: ({ signal }) => adminApi.get(path, params, signal),
    enabled: enabled && !!store && (permission === 'self' || can(permission)),
    retry: false,
    staleTime: 30000,
  });
}
export function useFinanceAction(
  permission: string,
  action: (data: Row) => Promise<unknown>,
  onSuccess?: (value: unknown) => void,
) {
  const { can, readOnly } = useCommerceAccess(),
    client = useQueryClient();
  return useMutation({
    mutationFn: (data: Row) => {
      if (readOnly || (permission !== 'self' && !can(permission)))
        throw new Error('Action non autorisée.');
      return action(data);
    },
    retry: false,
    onSuccess: (value) => {
      void client.invalidateQueries({ queryKey: ['admin'] });
      void client.invalidateQueries({ queryKey: ['notifications'] });
      onSuccess?.(value);
    },
  });
}
export function useFinanceList(path: string, params: Row, permission: string) {
  const { store, can } = useCommerceAccess();
  return useInfiniteQuery({
    queryKey: ['admin', store, path, params],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) =>
      financePage(await adminApi.get(path, { ...params, page: pageParam, per_page: 20 }, signal)),
    getNextPageParam: (last, _all, page) => (page < last.lastPage ? page + 1 : undefined),
    enabled: !!store && (permission === 'self' || can(permission)),
    retry: false,
    staleTime: 30000,
  });
}
export function Metric({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: string;
  tone?: 'blue' | 'green' | 'red' | 'amber';
}) {
  const background = { blue: '#eff4ff', green: '#e7f8f1', red: '#fff0f2', amber: '#fff6e8' }[tone];
  return (
    <View style={[f.metric, { backgroundColor: background }]}>
      <AppText variant="bodySm">{label}</AppText>
      <AppText style={[f.amount, { fontSize: 22 }]}>{value}</AppText>
    </View>
  );
}
export function FinanceRow({
  title,
  subtitle,
  value,
  badge,
  onPress,
  icon = 'account-balance',
}: {
  title: string;
  subtitle?: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={f.line}
    >
      <View style={f.icon}>
        <Icon name={icon} color="primary" size={20} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="labelLg">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySm" color="outline">
            {subtitle}
          </AppText>
        ) : null}
        {badge ? (
          <AppText variant="bodySm" style={{ color: '#047857' }}>
            {badge}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="labelLg" style={{ maxWidth: '40%', textAlign: 'right' }}>
          {value}
        </AppText>
      ) : null}
      {onPress ? <Icon name="chevron-right" size={18} /> : null}
    </Pressable>
  );
}
export function QueryState({
  query,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
  children: ReactNode;
}) {
  return query.isPending ? (
    <AppText>Chargement…</AppText>
  ) : query.isError ? (
    <>
      <AppText>{query.error?.message}</AppText>
      <Button label="Réessayer" onPress={() => void query.refetch()} />
    </>
  ) : (
    <>{children}</>
  );
}
export const f = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: '45%', padding: 14, borderRadius: 12, gap: 8 },
  amount: { fontSize: 28, lineHeight: 36, color: '#01509d', fontWeight: '700' },
  line: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#edf0f8',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff4ff',
  },
  surface: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  section: { fontSize: 16, lineHeight: 24, fontWeight: '700', color: '#102544' },
});
