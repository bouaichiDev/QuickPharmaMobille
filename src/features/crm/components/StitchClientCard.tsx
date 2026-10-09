import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { CrmAvatar, crmStyles } from './CrmDesign';
import { itemName, record, type CrmRecord } from '../crmApi';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { formatAmount } from '@/utils/format';
export function StitchClientCard({
  row,
  showMoney,
  onPress,
}: {
  row: CrmRecord;
  showMoney: boolean;
  onPress?: () => void;
}) {
  const currency = useCurrency();
  const { locale } = useTranslation();
  const name = itemName(row);
  const last = record(row.last_session);
  const service = itemName(record(last.service));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={[crmStyles.card, { padding: 12, gap: 8 }]}
    >
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <CrmAvatar name={name} />
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="labelLg" numberOfLines={1}>
            {name}
          </AppText>
          <AppText style={{ fontSize: 10, lineHeight: 14 }} color="outline" numberOfLines={1}>
            {[row.Phone, row.Cin && `CIN : ${row.Cin}`].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <Badge
          label={Number(row.Active) === 1 ? 'Actif' : 'Inactif'}
          tone={Number(row.Active) === 1 ? 'success' : 'neutral'}
        />
        <Icon name="chevron-right" size={16} color="outline" />
      </View>
      {service ||
      row.sessions_count !== undefined ||
      (showMoney && row.total_spent !== undefined) ? (
        <View
          style={[
            crmStyles.inset,
            { padding: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
          ]}
        >
          <Icon name="history" size={14} color="secondary" />
          <AppText style={{ fontSize: 11, lineHeight: 15, flex: 1 }}>
            {service || `${row.sessions_count ?? 0} séances`}
          </AppText>
          {showMoney && row.total_spent !== undefined ? (
            <AppText variant="labelSm" color="secondary">
              Réglé : {formatAmount(row.total_spent, currency, locale)}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
