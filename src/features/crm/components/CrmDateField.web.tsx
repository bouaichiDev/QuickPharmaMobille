import { createElement } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { colors, fontFamilies } from '@/theme';
import type { CrmDateFieldProps } from './CrmDateField';
export function CrmDateField({ label, value, onChange, time }: CrmDateFieldProps) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="labelLg">{label}</AppText>
      {createElement('input', {
        type: time ? 'datetime-local' : 'date',
        'aria-label': label,
        lang: 'fr',
        value: value.replace(' ', 'T'),
        onChange: (event: { target: { value: string } }) => onChange(event.target.value),
        style: {
          boxSizing: 'border-box',
          width: '100%',
          border: 0,
          backgroundColor: colors.surfaceContainerLow,
          borderRadius: 12,
          minHeight: 48,
          padding: 12,
          color: colors.onSurface,
          fontFamily: fontFamilies.body,
          fontSize: 14,
          outlineColor: colors.primary,
        },
      })}
    </View>
  );
}
