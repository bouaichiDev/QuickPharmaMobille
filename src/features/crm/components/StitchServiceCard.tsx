import { router, type Href } from 'expo-router';
import { useAccess } from '@/features/access/useAccess';
import { can } from '../modules';
import { itemId } from '../crmApi';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { formatAmount } from '@/utils/format';
import { itemName, type CrmRecord } from '../crmApi';
import { crmStyles } from './CrmDesign';

export function StitchServiceCard({
  row,
  onPress,
  onEdit,
  onDelete,
}: {
  row: CrmRecord;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const access = useAccess();
  const currency = useCurrency();
  const { locale } = useTranslation();
  const name = itemName(row);
  const active = Number(row.active ?? row.Active) === 1;
  return (
    <View style={[crmStyles.card, { padding: 14, gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: String(row.color ?? '#75f7ea'),
            marginTop: 5,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={name}
          onPress={onPress}
          style={{ flex: 1, gap: 4 }}
        >
          <AppText variant="headlineSm">{name}</AppText>
          {row.description ? (
            <AppText variant="bodySm" color="onSurfaceVariant" numberOfLines={3}>
              {String(row.description)}
            </AppText>
          ) : null}
        </Pressable>
        <View
          style={{
            borderRadius: 14,
            backgroundColor: '#d5e3ff',
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <AppText variant="labelSm" color={active ? 'secondary' : 'outline'}>
            {active ? 'Actif' : 'Inactif'}
          </AppText>
        </View>
      </View>
      <View
        style={{
          padding: 10,
          borderRadius: 10,
          backgroundColor: '#eff4ff',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          flexWrap: 'wrap',
        }}
      >
        <Icon name="payments" size={16} color="primary" />
        <AppText variant="headlineSm" color="primary">
          {formatAmount(row.default_price, currency, locale)}
        </AppText>
        <AppText color="outline">·</AppText>
        <Icon name="schedule" size={15} color="outline" />
        <AppText variant="bodySm">{String(row.duration_minutes ?? '—')} min</AppText>
        <AppText color="outline">·</AppText>
        <Icon name="repeat" size={15} color="outline" />
        <AppText variant="bodySm">{String(row.recommended_sessions ?? '—')} séances</AppText>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
        <Pressable
          onPress={can(access.data, 'services.fields.manage') ? () => router.push(`/crm/form-builder?service=${encodeURIComponent(itemId(row))}` as Href) : onPress}
          accessibilityRole="button"
          accessibilityLabel="Champs supplémentaires du service"
          style={{ padding: 8 }}
        >
          <Icon name="tune" size={19} color="outline" />
        </Pressable>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Modifier le service"
            style={{ padding: 8 }}
          >
            <Icon name="edit" size={19} color="outline" />
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Supprimer le service"
            style={{ padding: 8 }}
          >
            <Icon name="delete-outline" size={19} color="outline" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
