import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { colors, radii, spacing } from '@/theme';

interface ExpirationDateFieldProps {
  label: string;
  placeholder: string;
  value: string;
  locale: string;
  doneLabel: string;
  onChange: (value: string) => void;
}

function dateFromValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function valueFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ExpirationDateField({
  label,
  placeholder,
  value,
  locale,
  doneLabel,
  onChange,
}: ExpirationDateFieldProps) {
  const selectedDate = dateFromValue(value);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate ?? new Date());
  const displayedValue = selectedDate
    ? new Intl.DateTimeFormat(locale).format(selectedDate)
    : placeholder;

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate ?? new Date(),
        mode: 'date',
        display: 'default',
        onValueChange: (_event, date) => onChange(valueFromDate(date)),
      });
      return;
    }
    setDraftDate(selectedDate ?? new Date());
    setPickerVisible(true);
  }

  return (
    <View style={styles.field}>
      <AppText variant="labelSm">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={placeholder}
        onPress={openPicker}
        style={styles.dateField}
      >
        <AppText
          variant="bodyMd"
          color={selectedDate ? 'onSurface' : 'outline'}
          style={styles.value}
        >
          {displayedValue}
        </AppText>
        <Icon name="calendar-today" size="sm" color="primary" />
      </Pressable>
      {Platform.OS === 'ios' ? (
        <BottomSheet visible={pickerVisible} onClose={() => setPickerVisible(false)} title={label}>
          <DateTimePicker
            value={draftDate}
            mode="date"
            display="spinner"
            locale={locale}
            themeVariant="light"
            onValueChange={(_event, date) => setDraftDate(date)}
          />
          <Button
            label={doneLabel}
            onPress={() => {
              onChange(valueFromDate(draftDate));
              setPickerVisible(false);
            }}
          />
        </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  dateField: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  value: { flex: 1 },
});
