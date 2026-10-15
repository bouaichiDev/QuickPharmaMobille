import { customDefault } from '../dynamicFields';
import { Switch, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { CrmDateField } from './CrmDateField';
import { CrmColorPalette } from './CrmChoiceControls';
import { type CrmRecord } from '../crmApi';

export function CrmDynamicField({
  field,
  value,
  onChange,
}: {
  field: CrmRecord;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = `${String(field.label || field.name)}${field.required ? ' *' : ''}`;
  const type = String(field.type);
  const current = customDefault(field, value);
  const text = String(current ?? '');
  if (['checkbox', 'switch'].includes(type))
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="labelLg" style={{ flex: 1 }}>
          {label}
        </AppText>
        <Switch
          accessibilityLabel={label}
          value={current === true || current === 1 || current === '1'}
          onValueChange={(next) => onChange(next ? 1 : 0)}
        />
      </View>
    );
  if (['date', 'datetime'].includes(type))
    return (
      <CrmDateField label={label} value={text} time={type === 'datetime'} onChange={onChange} />
    );
  if (type === 'color')
    return (
      <View style={{ gap: 8 }}>
        <AppText variant="labelLg">{label}</AppText>
        <CrmColorPalette value={text} onChange={onChange} />
      </View>
    );
  if (['select', 'radio', 'multiselect'].includes(type))
    return (
      <View style={{ gap: 8 }}>
        <AppText variant="labelLg">{label}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Array.isArray(field.options) ? field.options : []).map((entry) => {
            const option = String(entry);
            const selected =
              type === 'multiselect' ? (current as string[]).includes(option) : text === option;
            return (
              <Button
                key={option}
                compact
                fullWidth={false}
                label={option}
                variant={selected ? 'primary' : 'tonal'}
                onPress={() =>
                  onChange(
                    type === 'multiselect'
                      ? selected
                        ? (current as string[]).filter((v) => v !== option)
                        : [...(current as string[]), option]
                      : option,
                  )
                }
              />
            );
          })}
        </View>
      </View>
    );
  return (
    <TextField
      appearance="crm"
      label={label}
      value={text}
      placeholder={String(field.placeholder ?? '')}
      onChangeText={onChange}
      autoCapitalize={['email', 'url', 'json'].includes(type) ? 'none' : 'sentences'}
      multiline={['textarea', 'json'].includes(type)}
      keyboardType={
        ['number', 'decimal'].includes(type)
          ? 'decimal-pad'
          : type === 'email'
            ? 'email-address'
            : type === 'phone'
              ? 'phone-pad'
              : 'default'
      }
    />
  );
}
