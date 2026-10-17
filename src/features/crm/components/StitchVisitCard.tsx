import { canConvertAppointment } from '../appointmentSession';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { colors } from '@/theme';
import { formatAmount, formatDateTime } from '@/utils/format';
import { itemName, record, type CrmRecord } from '../crmApi';
import { CrmMiniAction } from './StitchChrome';

const statuses: Record<string, string> = {
  planned: 'Planifiée',
  completed: 'Terminée',
  confirmed: 'Confirmé',
  pending: 'En attente',
  in_progress: 'En cours',
  cancelled: 'Annulée',
  no_show: 'Absent',
  postponed: 'Reporté',
};
export function StitchVisitCard({
  row,
  appointment = false,
  showMoney,
  onPress,
  onEdit,
  onConvert,
}: {
  row: CrmRecord;
  appointment?: boolean;
  showMoney: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onConvert?: () => void;
}) {
  const { locale } = useTranslation();
  const currency = useCurrency();
  const money = (v: unknown) => formatAmount(v, currency, locale);
  const service = itemName(record(row.service)) || itemName(record(row.service_package)) || 'Soin';
  const client = itemName(record(row.customer));
  const employee = itemName(record(row.employee));
  const status = record(row.status);
  const code = String(status.code ?? (typeof row.status === 'string' ? row.status : ''));
  const packageRow = record(row.customer_service_package ?? row.customerServicePackage);
  const packageName = itemName(packageRow);
  const date = String((appointment ? row.starts_at : row.session_date) ?? row.starts_at ?? '');
  const time = date.match(/\d{2}:\d{2}/)?.[0];
  const duration =
    row.duration_minutes ??
    (row.ends_at && row.starts_at
      ? Math.round(
          (new Date(String(row.ends_at).replace(' ', 'T')).getTime() -
            new Date(String(row.starts_at).replace(' ', 'T')).getTime()) /
            60000,
        )
      : undefined) ??
    record(row.service).duration_minutes;
  const prescription = Array.isArray(row.prescription) && row.prescription.length > 0;
  const meta = (label: string, value: string, icon: IconName) => (
    <View style={styles.meta}>
      <Icon name={icon} size={17} color="outline" />
      <View style={{ flex: 1, gap: 1 }}>
        <AppText style={{ fontSize: 11, lineHeight: 14 }} color="outline">
          {label}
        </AppText>
        <AppText variant="labelMd" numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
  if (appointment)
    return (
      <View style={[styles.card, code === 'cancelled' && { opacity: 0.55 }]}>
        <View style={styles.row}>
          <View style={styles.time}>
            <AppText variant="labelSm" color="primary">
              {time || '—'}
            </AppText>
            {row.ends_at ? (
              <AppText style={{ fontSize: 9 }} color="outline">
                {String(row.ends_at).match(/\d{2}:\d{2}/)?.[0]}
              </AppText>
            ) : null}
          </View>
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={client || service}
            style={{ flex: 1, gap: 2 }}
          >
            <AppText variant="headlineSm" numberOfLines={1} style={{ fontSize: 16 }}>
              {client || service}
            </AppText>
            <AppText variant="bodySm" numberOfLines={1}>
              {service}
            </AppText>
          </Pressable>
          <View
            style={[
              styles.status,
              { backgroundColor: code === 'in_progress' ? '#c6faf2' : '#e5eeff' },
            ]}
          >
            <AppText variant="labelSm" color="primary" style={{ fontSize: 10 }}>
              {String(status.label ?? statuses[code] ?? code)}
            </AppText>
          </View>
        </View>
        <View style={[styles.inset, styles.row]}>
          <Icon name="badge" size={15} color="primary" />
          <AppText variant="bodySm" color="primary" style={{ flex: 1 }}>
            {employee || 'Praticien non attribué'}
          </AppText>
          {duration ? (
            <>
              <Icon name="schedule" size={14} color="primary" />
              <AppText variant="labelSm" color="primary">
                {String(duration)} min
              </AppText>
            </>
          ) : null}
        </View>
        {row.notes ? (
          <AppText variant="bodySm" color="outline">
            {String(row.notes)}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          {onConvert && canConvertAppointment(row) ? (
            <View style={{ flex: 1 }}>
              <CrmMiniAction
                label="Convertir en séance directe"
                icon="play-circle-outline"
                primary
                onPress={onConvert}
              />
            </View>
          ) : null}
          {onEdit ? <CrmMiniAction label="Modifier" icon="edit-calendar" onPress={onEdit} /> : null}
        </View>
      </View>
    );
  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={[styles.row, { paddingTop: 4, alignItems: 'flex-start' }]}>
        <View style={styles.spa}>
          <Icon name="spa" size={22} color="secondary" />
        </View>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={service}
          style={{ flex: 1, gap: 3 }}
        >
          <AppText variant="headlineSm" numberOfLines={1}>
            {service}
          </AppText>
          <View style={styles.row}>
            <Icon name="person-outline" size={15} color="primary" />
            <AppText variant="labelMd" color="primary" numberOfLines={1} style={{ flex: 1 }}>
              {client}
            </AppText>
          </View>
        </Pressable>
        {code ? (
          <View style={styles.status}>
            <Icon
              name={code === 'completed' ? 'check-circle-outline' : 'schedule'}
              size={12}
              color="secondary"
            />
            <AppText variant="labelSm" style={{ fontSize: 10 }}>
              {String(status.label ?? statuses[code] ?? code)}
            </AppText>
          </View>
        ) : null}
        <Pressable
          onPress={onPress}
          accessibilityLabel="Actions de la séance"
          style={{ padding: 3 }}
        >
          <Icon name="more-vert" size={20} color="primary" />
        </Pressable>
      </View>
      {packageName ? (
        <View style={styles.package}>
          <Icon name="verified" size={15} color="secondary" />
          <AppText variant="labelSm" color="secondary" style={{ flexShrink: 1 }}>
            Rattaché : {packageName}
            {packageRow.sessions_total && packageRow.remaining_sessions !== undefined
              ? ` (Séance ${Number(packageRow.sessions_total) - Number(packageRow.remaining_sessions)}/${packageRow.sessions_total})`
              : ''}
          </AppText>
        </View>
      ) : null}
      <View style={styles.inset}>
        <View style={styles.row}>
          {meta('Date & heure', date ? formatDateTime(date, locale) : 'Non renseignée', 'event')}
          {meta('Durée', `${row.duration_minutes ?? '—'} min`, 'schedule')}
        </View>
        <View style={styles.row}>
          {meta('Intervenant', employee || 'Non attribué', 'badge')}
          {row.location || row.room
            ? meta('Lieu', String(row.location ?? row.room), 'meeting-room')
            : null}
        </View>
      </View>
      {showMoney ? (
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={[styles.row, { gap: 4 }]}>
            <AppText variant="bodySm" color="outline">
              Prix :
            </AppText>
            <AppText variant="headlineSm" style={{ fontSize: 18 }}>
              {money(row.price)}
            </AppText>
          </View>
          {packageName ? (
            <View style={styles.status}>
              <AppText variant="labelSm" color="primary" style={{ fontSize: 10 }}>
                Inclus forfait
              </AppText>
            </View>
          ) : null}
          <View style={[styles.row, { gap: 4 }]}>
            <AppText variant="bodySm" color="outline">
              Reste :
            </AppText>
            <AppText
              variant="headlineSm"
              style={{ fontSize: 18 }}
              color={Number(row.due) > 0 ? 'error' : 'secondary'}
            >
              {money(row.due)}
            </AppText>
          </View>
        </View>
      ) : null}
      <View style={styles.actions}>
        {prescription ? (
          <CrmMiniAction label="Ordonnance" icon="description" onPress={onPress} />
        ) : null}
        {onEdit ? <CrmMiniAction label="Modifier" icon="edit" onPress={onEdit} /> : null}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#edf0f8',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accent: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.secondary,
  },
  spa: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#c6faf2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    backgroundColor: '#e5eeff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  package: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  inset: { backgroundColor: '#f5f7ff', borderRadius: 12, padding: 10, gap: 8 },
  meta: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  time: { padding: 5, borderRadius: 7, backgroundColor: '#e5eeff', alignItems: 'center' },
});
