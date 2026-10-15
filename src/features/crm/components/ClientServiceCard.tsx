import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { formatAmount } from '@/utils/format';
import { itemName, record, type CrmRecord } from '../crmApi';
import { crmStyles } from './CrmDesign';
export function ClientServiceCard({
  row,
  showMoney,
  children,
  onPrint,
}: {
  row: CrmRecord;
  showMoney: boolean;
  children?: ReactNode;
  onPrint?: () => void;
}) {
  const service = record(row.service);
  const currency = useCurrency();
  const { locale } = useTranslation();
  return (
    <View style={crmStyles.card}>
      <View style={crmStyles.row}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: '#c6faf2',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="spa" color="secondary" size={22} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="headlineSm" numberOfLines={1}>
            {itemName(service)}
          </AppText>
          <AppText variant="bodySm" color="outline">
            {service.duration_minutes ? `${service.duration_minutes} min` : 'Soin individuel'}
          </AppText>
        </View>
        <Badge label={`${row.sessions_count ?? 0} séance(s)`} tone="primary" />
      </View>
      {showMoney && service.default_price !== undefined ? (
        <View style={[crmStyles.inset, { flexDirection: 'row', alignItems: 'center' }]}>
          <AppText variant="labelSm" style={{ flex: 1 }}>
            TARIF UNITAIRE
          </AppText>
          <AppText variant="labelLg" color="primary">
            {formatAmount(service.default_price, currency, locale)}
          </AppText>
        </View>
      ) : null}
      {children}
      {onPrint ? (
        <Button
          label="Imprimer le dossier de ce service"
          variant="tonal"
          icon="print"
          onPress={onPrint}
        />
      ) : null}
    </View>
  );
}
