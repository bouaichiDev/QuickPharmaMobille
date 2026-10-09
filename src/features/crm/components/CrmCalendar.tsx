import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';
import { crmStyles } from './CrmDesign';
import { useTranslation } from '@/i18n/useTranslation';
export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function CrmCalendar({
  value,
  onChange,
  markers = {},
}: {
  value: string;
  onChange: (value: string) => void;
  markers?: Record<string, number>;
}) {
  const { locale } = useTranslation();
  const [week, setWeek] = useState(() => (value ? new Date(`${value}T12:00:00`) : new Date()));
  const monday = new Date(week);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    return date;
  });
  const isoThursday = new Date(
    Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3),
  );
  const isoWeek = Math.ceil(
    ((isoThursday.getTime() - Date.UTC(isoThursday.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7,
  );
  function move(delta: number) {
    const next = new Date(week);
    next.setDate(next.getDate() + delta);
    setWeek(next);
  }
  return (
    <View style={[crmStyles.card, { padding: 12, gap: 10, borderRadius: 12 }]}>
      <View style={crmStyles.row}>
        <Icon name="event" color="primary" size={17} />
        <AppText variant="labelLg" style={crmStyles.grow}>
          {week.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </AppText>
        <Pressable
          onPress={() => move(-7)}
          accessibilityRole="button"
          accessibilityLabel="Semaine précédente"
          style={{ padding: 5 }}
        >
          <Icon name="chevron-left" color="primary" size={17} />
        </Pressable>
        <Pressable
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel="Afficher toutes les dates"
          style={{
            backgroundColor: '#e5eeff',
            borderRadius: 14,
            paddingHorizontal: 7,
            paddingVertical: 3,
          }}
        >
          <AppText variant="labelSm" style={{ fontSize: 10 }}>
            Semaine {isoWeek}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => move(7)}
          accessibilityRole="button"
          accessibilityLabel="Semaine suivante"
          style={{ padding: 5 }}
        >
          <Icon name="chevron-right" color="primary" size={17} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {days.map((date) => {
          const key = localDate(date);
          const selected = key === (value || localDate(new Date()));
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={date.toLocaleDateString(locale)}
              accessibilityState={{ selected }}
              onPress={() => onChange(key)}
              style={{
                flex: 1,
                paddingVertical: 7,
                gap: 3,
                alignItems: 'center',
                borderRadius: 9,
                backgroundColor: selected ? colors.primary : colors.surfaceContainerLowest,
              }}
            >
              <AppText
                style={{ fontSize: 10 }}
                variant="bodySm"
                color={selected ? 'onPrimary' : 'outline'}
              >
                {date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}
              </AppText>
              <AppText
                style={{ fontSize: 15, lineHeight: 19 }}
                variant="headlineSm"
                color={selected ? 'onPrimary' : 'onSurface'}
              >
                {date.getDate()}
              </AppText>
              <View style={{ height: 5, flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: Math.min(3, markers[key] ?? 0) }, (_, index) => (
                  <View
                    key={index}
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: selected ? '#fff' : colors.secondary,
                    }}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {[
          ['Consultation soin', colors.primary],
          ['Séance forfait', colors.secondary],
          ['Bilan', colors.outline],
        ].map(([label, color]) => (
          <View key={label} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
            <AppText style={{ fontSize: 9, lineHeight: 12 }} color="outline">
              {label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
