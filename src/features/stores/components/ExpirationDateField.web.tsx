import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, fontFamilies, radii, spacing } from '@/theme';

interface ExpirationDateFieldProps {
  label: string;
  placeholder: string;
  value: string;
  locale: string;
  doneLabel: string;
  onChange: (value: string) => void;
}

export function ExpirationDateField({
  label,
  placeholder,
  value,
  locale,
  onChange,
}: ExpirationDateFieldProps) {
  const webInputProps = { type: 'date', lang: locale } as { type: string; lang: string };
  return (
    <View style={styles.field}>
      <AppText variant="labelSm">{label}</AppText>
      <TextInput
        {...webInputProps}
        accessibilityLabel={label}
        accessibilityHint={placeholder}
        value={value}
        onChangeText={onChange}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
    color: colors.onSurface,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
});
