import { StitchClientCard } from './StitchClientCard';
import { StitchFinancialCard } from './StitchFinancialCard';
import { StitchServiceCard } from './StitchServiceCard';
import { StitchVisitCard } from './StitchVisitCard';
import { CrmAuditCard } from './CrmAuditCard';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { colors } from '@/theme';
import { formatAmount, formatDateTime, formatNumber, toNumber } from '@/utils/format';
import { itemName, record, type CrmRecord } from '../crmApi';
import type { CrmModule } from '../modules';
import { CrmAvatar, crmStyles } from './CrmDesign';

export const statusLabels: Record<string, string> = {
  planned: 'Planifiée',
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminée',
  cancelled: 'Annulée',
  no_show: 'Absent',
  absent: 'Absent',
  postponed: 'Reporté',
  in_progress: 'En cours',
  paid: 'Payé',
  partial: 'Partiel',
  active: 'Actif',
  inactive: 'Inactif',
};
export function statusTone(code: string): BadgeTone {
  if (['paid', 'completed', 'confirmed', 'active'].includes(code)) return 'success';
  if (['cancelled', 'no_show', 'absent', 'inactive'].includes(code)) return 'danger';
  if (['pending', 'partial', 'postponed'].includes(code)) return 'warning';
  return 'primary';
}
export function CrmRecordCard({
  row,
  module,
  onPress,
  showMoney = false,
  onEdit,
  onConvert,
  onDelete,
  onCollect,
}: {
  row: CrmRecord;
  module: CrmModule;
  onPress?: () => void;
  showMoney?: boolean;
  onEdit?: () => void;
  onConvert?: () => void;
  onDelete?: () => void;
  onCollect?: () => void;
}) {
  const { locale, tDynamic } = useTranslation();
  const currency = useCurrency();
  if (module.key === 'clients')
    return <StitchClientCard row={row} showMoney={showMoney} onPress={onPress} />;
  if (['packages', 'payments'].includes(module.key))
    return (
      <StitchFinancialCard
        row={row}
        packageCard={module.key === 'packages'}
        showMoney={showMoney}
        onPress={onPress}
        onEdit={onEdit}
        onCollect={onCollect}
      />
    );
  if (module.key === 'services')
    return <StitchServiceCard row={row} onPress={onPress} onEdit={onEdit} onDelete={onDelete} />;
  if (['sessions', 'appointments'].includes(module.key))
    return (
      <StitchVisitCard
        row={row}
        appointment={module.key === 'appointments'}
        showMoney={showMoney}
        onPress={onPress}
        onEdit={onEdit}
        onConvert={onConvert}
      />
    );
  if (module.key === 'timeline') return <CrmAuditCard row={row} onPress={onPress} />;
  const customer = itemName(record(row.customer));
  const service = itemName(record(row.service));
  const packageName = itemName(record(row.service_package ?? row.servicePackage));
  const isVisit = ['sessions', 'appointments'].includes(module.key);
  const isClient = module.key === 'clients';
  const title = isVisit
    ? service || packageName || module.label
    : itemName(row) || packageName || customer || module.label;
  const subtitle =
    isVisit || module.key === 'packages'
      ? customer
      : isClient
        ? [row.Phone || row.Email, row.Cin ? `CIN : ${String(row.Cin)}` : '']
            .filter(Boolean)
            .join(' · ')
        : String(row.description || '');
  const rawStatus = record(row.status);
  const status = String(
    rawStatus.code ??
      (typeof row.status === 'string'
        ? row.status
        : row.Active !== undefined || row.active !== undefined
          ? Number(row.Active ?? row.active) === 1
            ? 'active'
            : 'inactive'
          : ''),
  );
  const statusLabel = String(
    rawStatus.label || tDynamic(`mobile.crm.status.${status}`, statusLabels[status] || status),
  );
  const date = row.session_date ?? row.starts_at ?? row.date;
  const employee = itemName(record(row.employee));
  const attachedPackage = itemName(
    record(row.customer_service_package ?? row.customerServicePackage),
  );
  const amount = (value: unknown) => formatAmount(value, currency, locale);
  const number = (value: unknown) => formatNumber(value, locale);
  const metrics: { label: string; value: string; danger?: boolean }[] = [];
  const add = (label: string, value: unknown, monetary = false, danger = false) => {
    if (value !== undefined && value !== null && (!monetary || showMoney))
      metrics.push({ label, value: monetary ? amount(value) : number(value), danger });
  };
  if (module.key === 'sessions') {
    add('Prix', row.price, true);
    add('Payé', row.amount_paid, true);
    add('Reste', row.due, true, (toNumber(row.due) ?? 0) > 0);
  }
  if (['packages', 'payments'].includes(module.key))
    return (
      <StitchFinancialCard
        row={row}
        packageCard={module.key === 'packages'}
        showMoney={showMoney}
        onPress={onPress}
        onEdit={onEdit}
        onCollect={onCollect}
      />
    );
  if (module.key === 'services') {
    add('Prix unitaire', row.default_price, true);
    if (row.duration_minutes !== undefined)
      metrics.push({ label: 'Durée', value: `${number(row.duration_minutes)} min` });
    add('Séances', row.recommended_sessions);
  }
  if (['packages', 'service-packages'].includes(module.key)) {
    add('Prix', row.price_paid ?? row.price, true);
    add('Séances', row.sessions_total ?? row.sessions_count);
    if (module.key === 'packages') add('Restantes', row.remaining_sessions);
  }
  if (isClient) {
    add('Séances', row.sessions_count ?? row.total_sessions);
    add('Total réglé', row.total_spent, true);
  }
  if (module.key === 'payments') {
    add('Montant', row.payingAmount, true);
    add('Reçu', row.receivedAmount, true);
  }
  const note = String(
    row.observation || row.notes || (module.key === 'timeline' ? row.details : '') || '',
  );
  const color = String(record(row.service).color ?? row.color ?? '');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      {module.key === 'sessions' ? <View style={styles.accent} /> : null}
      <View style={styles.main}>
        {isClient ? (
          <CrmAvatar name={title} />
        ) : (
          <View style={styles.icon}>
            <Icon name={module.icon} color="primary" size={24} />
          </View>
        )}
        <View style={styles.copy}>
          <AppText variant="headlineSm" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="bodySm"
              color="onSurfaceVariant"
              numberOfLines={module.key === 'services' ? 2 : 1}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {status ? <Badge label={statusLabel} tone={statusTone(status)} /> : null}
        <Icon name="chevron-right" size={18} color="outline" flipInRTL />
      </View>
      {/^#[0-9a-f]{6}$/i.test(color) && module.key === 'services' ? (
        <View style={[styles.color, { backgroundColor: color }]} />
      ) : null}
      {attachedPackage ? (
        <View style={styles.tag}>
          <Icon name="local-offer" color="secondary" size={16} />
          <AppText variant="labelSm" color="secondary">
            {attachedPackage}
          </AppText>
        </View>
      ) : null}
      {isVisit && (date || employee || row.duration_minutes) ? (
        <View style={crmStyles.inset}>
          <View style={crmStyles.row}>
            <Icon name="event" size={18} color="outline" />
            <View style={crmStyles.grow}>
              <AppText variant="bodySm" color="outline">
                Date et heure
              </AppText>
              <AppText variant="labelMd">
                {date ? formatDateTime(String(date), locale) : 'Non renseignée'}
              </AppText>
            </View>
            {row.duration_minutes ? (
              <View>
                <AppText variant="bodySm" color="outline">
                  Durée
                </AppText>
                <AppText variant="labelMd">{number(row.duration_minutes)} min</AppText>
              </View>
            ) : null}
          </View>
          {employee ? (
            <View style={crmStyles.row}>
              <Icon name="person-outline" size={18} color="primary" />
              <AppText variant="bodySm">{employee}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}
      {metrics.length ? (
        <View style={styles.metrics}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metric}>
              <AppText variant="bodySm" color="outline">
                {metric.label}
              </AppText>
              <AppText
                variant="labelLg"
                color={metric.danger ? 'error' : 'primary'}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {metric.value}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      {note ? (
        <AppText variant="bodySm" color="onSurfaceVariant" numberOfLines={2}>
          {note}
        </AppText>
      ) : null}
      {module.key === 'packages' && Number(row.sessions_total) > 0 ? (
        <View style={styles.track}>
          <View
            style={[
              styles.progress,
              {
                width: `${Math.min(100, Math.max(0, (Number(row.sessions_used ?? 0) / Number(row.sessions_total)) * 100))}%`,
              },
            ]}
          />
        </View>
      ) : null}
      {module.key === 'form-builder' ? <Badge label={String(row.type ?? 'text')} /> : null}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf0f8',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.secondary,
  },
  main: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1, gap: 4 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  color: { width: 10, height: 10, borderRadius: 5 },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbfbf7',
    borderRadius: 8,
    padding: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLow,
  },
  metric: { flex: 1, gap: 3 },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progress: { height: '100%', backgroundColor: colors.secondary, borderRadius: 4 },
});
