import { useCrmRecordContext } from '../useCrmRecordContext';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { formatAmount, formatDateTime } from '@/utils/format';
import { itemName, record, type CrmRecord } from '../crmApi';
import { crmStyles } from './CrmDesign';
import { CrmMiniAction } from './StitchChrome';

export function StitchFinancialCard({
  row,
  packageCard,
  showMoney,
  onPress,
  onEdit,
  onCollect,
}: {
  row: CrmRecord;
  packageCard: boolean;
  showMoney: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onCollect?: () => void;
}) {
  const context = useCrmRecordContext(row);
  const currency = useCurrency();
  const { locale } = useTranslation();
  const money = (v: unknown) => formatAmount(v, currency, locale);
  const bundle = record(row.service_package ?? row.servicePackage);
  const title = packageCard
    ? itemName(bundle) || itemName(row)
    : itemName(context.customer) || 'Client non renseigné';
  const total = Number(row.sessions_total ?? row.sessions_count ?? 0);
  const used = Number(row.sessions_used ?? 0);
  const remaining = row.remaining_sessions ?? total - used;
  const due = Number(row.due ?? 0);
  const status = record(row.status);
  return (
    <View style={[crmStyles.card, { padding: 14, gap: 12 }]}>
      <View style={crmStyles.row}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: '#c6faf2',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={packageCard ? 'local-offer' : 'payments'} size={22} color="secondary" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onPress}
          style={{ flex: 1, gap: 3 }}
        >
          <AppText variant="headlineSm" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="bodySm" color="outline">
            {packageCard
              ? `Pack de ${total} séances`
              : itemName(context.service) ||
                itemName(record(row.service_package)) ||
                (row.src === 'customer_service_package'
                  ? 'Règlement de forfait'
                  : 'Règlement de séance')}
          </AppText>
        </Pressable>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 14,
            backgroundColor: due > 0 ? '#fff1e3' : '#dbfbf7',
          }}
        >
          <AppText variant="labelSm" color={due > 0 ? 'error' : 'secondary'}>
            {String(
              status.label ??
                (typeof row.status === 'string'
                  ? (
                      { paid: 'Payé', active: 'Actif', partial: 'Partiel' } as Record<
                        string,
                        string
                      >
                    )[row.status]
                  : undefined) ??
                (due > 0 ? 'À régler' : 'Réglé'),
            )}
          </AppText>
        </View>
      </View>
      {packageCard ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="labelMd" color="primary">
              {used} / {total} faits
            </AppText>
            <AppText variant="bodySm" color="outline">
              {String(remaining)} séances restantes
            </AppText>
          </View>
          <View
            style={{ height: 7, borderRadius: 4, backgroundColor: '#e5eeff', overflow: 'hidden' }}
          >
            <View
              style={{
                height: 7,
                width: `${total ? Math.min(100, (used / total) * 100) : 0}%`,
                backgroundColor: '#006a63',
                borderRadius: 4,
              }}
            />
          </View>
        </>
      ) : null}
      {showMoney ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            padding: 10,
            borderRadius: 10,
            backgroundColor: '#eff4ff',
          }}
        >
          {(packageCard
            ? [
                ['Prix', row.price_paid ?? row.price],
                ['Réglé', row.amount_paid],
                ['Reste', row.due],
              ]
            : [
                ['Montant', row.payingAmount],
                ['Reçu', row.receivedAmount],
              ]
          ).map(([label, value]) => (
            <View key={String(label)} style={{ flex: 1, gap: 4 }}>
              <AppText variant="bodySm" color="outline">
                {String(label)}
              </AppText>
              <AppText
                variant="headlineSm"
                style={{ fontSize: 17 }}
                color={label === 'Reste' && due > 0 ? 'error' : 'primary'}
              >
                {money(value)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      {row.expiration_date || row.date || row.created_at ? (
        <View style={crmStyles.row}>
          <Icon name="event" size={15} color="outline" />
          <AppText variant="bodySm" color="outline">
            {packageCard && row.expiration_date ? 'Expire le ' : ''}
            {formatDateTime(String(row.expiration_date ?? row.date ?? row.created_at), locale)}
          </AppText>
        </View>
      ) : null}
      {onCollect || onEdit || (packageCard && onPress) ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          {packageCard && onPress ? (
            <CrmMiniAction label="Voir le détail" icon="visibility" onPress={onPress} />
          ) : null}
          {onCollect ? (
            <CrmMiniAction label="Encaisser" icon="payments" primary onPress={onCollect} />
          ) : null}
          {onEdit ? <CrmMiniAction label="Modifier" icon="edit" onPress={onEdit} /> : null}
        </View>
      ) : null}
    </View>
  );
}
