import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fontFamilies, fontForScript, radii, spacing } from '@/theme';

import { AppText, useLatinFonts } from './AppText';
import { Icon, type IconName } from './Icon';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  appearance?: 'default' | 'crm';
  label: string;
  labelHint?: string;
  /** Element aligned with the label (e.g. "Forgot password?" link). */
  labelAccessory?: ReactNode;
  error?: string;
  secureToggle?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  footer?: ReactNode;
  leadingIcon?: IconName;
  suffix?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    appearance = 'default',
    labelHint,
    labelAccessory,
    error,
    secureToggle,
    showPasswordLabel = 'Show password',
    hidePasswordLabel = 'Hide password',
    footer,
    leadingIcon,
    suffix,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref,
) {
  const latin = useLatinFonts();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error
    ? colors.error
    : focused
      ? colors.primaryContainer
      : colors.outlineVariant;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="labelLg" color="onSurface" style={styles.label}>
          {label}
          {labelHint ? (
            <AppText variant="bodySm" color="outline">
              {' '}
              {labelHint}
            </AppText>
          ) : null}
        </AppText>
        {labelAccessory}
      </View>
      <View
        style={[
          styles.inputWrapper,
          appearance === 'crm' && styles.crmInput,
          {
            borderColor:
              appearance === 'crm' && !focused && !error ? colors.transparent : borderColor,
          },
          focused ? styles.focused : null,
        ]}
      >
        {leadingIcon ? (
          <Icon name={leadingIcon} size={18} color="outline" style={{ marginLeft: 12 }} />
        ) : null}
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={secureToggle ? hidden : inputProps.secureTextEntry}
          placeholderTextColor={colors.outline}
          accessibilityLabel={label}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            appearance === 'crm' && { fontSize: 14, paddingHorizontal: 12 },
            inputProps.multiline && { minHeight: 88, textAlignVertical: 'top' },
            fontForScript(fontFamilies.body, latin),
          ]}
        />
        {suffix ? (
          <AppText variant="labelSm" color="secondary" style={{ marginRight: 12 }}>
            {suffix}
          </AppText>
        ) : null}
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? showPasswordLabel : hidePasswordLabel}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
            style={styles.toggle}
          >
            <Icon name={hidden ? 'visibility-off' : 'visibility'} size="sm" color="outline" />
          </Pressable>
        ) : null}
      </View>
      {footer}
      {error ? (
        <AppText variant="bodySm" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  crmInput: { backgroundColor: colors.surfaceContainerLow, borderRadius: 12 },
  container: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
    minHeight: 48,
  },
  focused: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.onSurface,
    textAlign: 'auto',
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
