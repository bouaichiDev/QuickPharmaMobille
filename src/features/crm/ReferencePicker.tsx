import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { CrmPage } from '@/features/crm/components/CrmDesign';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet } from '@/services/api/client';
import { useTranslation } from '@/i18n/useTranslation';
import { useAccess } from '@/features/access/useAccess';
import { can } from './modules';
import { itemId, listPayload, record, type CrmRecord } from './crmApi';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';
import type { CrmField } from './fields';
import { eligibleSessionPackage, referenceLabel, userRole } from './sessionForm';

export function ReferencePicker({
  field,
  value,
  onChange,
  params,
  onSelect,
  compact = false,
}: {
  field: CrmField;
  value: string;
  onChange: (value: string) => void;
  params?: CrmRecord;
  onSelect?: (row: CrmRecord) => void;
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const { tDynamic } = useTranslation();
  const access = useAccess();
  const query = useQuery({
    queryKey: ['crm', store, 'reference', field.reference, page, search, params],
    enabled: visible || !!value,
    queryFn: async () =>
      listPayload(
        await apiGet(field.reference!, {
          params: {
            per_page: ['employee_id', 'customer_service_package_id'].includes(field.key) ? 500 : 20,
            page,
            search: search || undefined,
            ...params,
          },
        }),
      ),
  });
  const rows = (query.data?.rows ?? [])
    .filter((row) => field.key !== 'customer_service_package_id' || eligibleSessionPackage(row))
    .filter(
      (row) => field.key !== 'employee_id' || ![0, -1, '0', '-1'].includes(row.active as number),
    )
    .filter((row) =>
      `${referenceLabel(row, field.key)} ${field.key === 'employee_id' ? userRole(row) : ''} ${String(record(row.customer).name ?? '')}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => (field.key === 'employee_id' ? userRole(a).localeCompare(userRole(b)) : 0));
  return (
    <View style={{ gap: 8 }}>
      {!compact ? (
        <AppText variant="labelLg">
          {field.label}
          {field.required ? ' *' : ''}
        </AppText>
      ) : null}
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={field.label}
        style={{
          minHeight: compact ? 42 : 48,
          backgroundColor: compact ? colors.surfaceContainerLowest : colors.surfaceContainerLow,
          borderRadius: 12,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <AppText style={{ flex: 1 }} color={value ? 'onSurface' : 'outline'}>
          {value
            ? selected ||
              (query.data?.rows.find((row) => itemId(row) === value)
                ? referenceLabel(
                    query.data.rows.find((row) => itemId(row) === value)!,
                    field.key,
                  )
                : '') ||
              'Sélection enregistrée'
            : compact
              ? field.label
              : tDynamic('mobile.crm.select', 'Sélectionner')}
        </AppText>
        <Icon name="expand-more" color="primary" size={20} />
      </Pressable>
      {!field.required && value ? (
        <Button
          compact
          variant="ghost"
          label={tDynamic('mobile.crm.clear', 'Effacer')}
          onPress={() => {
            onChange('');
            setSelected('');
          }}
        />
      ) : null}
      <CrmPage visible={visible} onClose={() => setVisible(false)} title={field.label}>
        <TextField
          label={tDynamic('mobile.crm.search', 'Rechercher')}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
        />
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.isLoading ? (
          <AppText>Chargement…</AppText>
        ) : (
          rows
            .filter(
              (row) =>
                field.key !== 'status_id' ||
                !['completed', 'cancelled', 'no_show'].includes(String(row.code)) ||
                can(
                  access.data,
                  row.code === 'completed'
                    ? 'services.sessions.complete'
                    : 'services.sessions.cancel',
                ),
            )
            .map((row, index) => {
              const label = referenceLabel(row, field.key);
              return (
                <View key={itemId(row)} style={{ gap: 8 }}>
                  {field.key === 'employee_id' &&
                  (index === 0 || userRole(rows[index - 1]!) !== userRole(row)) ? (
                    <AppText variant="labelLg">{userRole(row)}</AppText>
                  ) : null}
                  <Button
                    variant="tonal"
                    label={label}
                    onPress={() => {
                      onChange(itemId(row));
                      onSelect?.(row);
                      setSelected(label);
                      setVisible(false);
                    }}
                  />
                </View>
              );
            })
        )}
        {!query.isLoading && !query.isError && !rows.length ? (
          <AppText>Aucun résultat.</AppText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label="Précédent"
            compact
            disabled={page <= 1}
            onPress={() => setPage(page - 1)}
            style={{ flex: 1 }}
          />
          <Button
            label="Suivant"
            compact
            disabled={page >= (query.data?.lastPage ?? 1)}
            onPress={() => setPage(page + 1)}
            style={{ flex: 1 }}
          />
        </View>
      </CrmPage>
    </View>
  );
}
