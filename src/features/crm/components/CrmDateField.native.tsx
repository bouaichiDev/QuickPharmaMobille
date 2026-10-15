import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { AppText } from '@/components/ui/AppText';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';
import { formatDateTime, formatDate } from '@/utils/format';
import { useTranslation } from '@/i18n/useTranslation';
import type { CrmDateFieldProps } from './CrmDateField';
export function CrmDateField({ label, value, onChange, time }: CrmDateFieldProps) {
  const { locale } = useTranslation();
  const parsed = new Date(value.replace(' ', 'T'));
  const date = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(date);
  const serialize = (next: Date) => {
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}${time ? ` ${pad(next.getHours())}:${pad(next.getMinutes())}` : ''}`;
  };
  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        onValueChange: (_, next) => {
          if (time)
            DateTimePickerAndroid.open({
              value: next,
              mode: 'time',
              is24Hour: true,
              onValueChange: (_, end) => onChange(serialize(end)),
            });
          else onChange(serialize(next));
        },
      });
    } else {
      setDraft(date);
      setVisible(true);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="labelLg">{label}</AppText>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: 12,
          minHeight: 48,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Icon name="event" color="outline" size={20} />
        <AppText style={{ flex: 1 }}>
          {value
            ? time
              ? formatDateTime(value, locale)
              : formatDate(value, locale)
            : 'Choisir une date'}
        </AppText>
      </Pressable>
      <SelectionDialog visible={visible} onClose={() => setVisible(false)} title={label}>
        <DateTimePicker
          value={draft}
          mode={time ? 'datetime' : 'date'}
          display="spinner"
          locale="fr"
          themeVariant="light"
          onValueChange={(_, next) => setDraft(next)}
        />
        <Button
          label="Valider"
          onPress={() => {
            onChange(serialize(draft));
            setVisible(false);
          }}
        />
      </SelectionDialog>
    </View>
  );
}
