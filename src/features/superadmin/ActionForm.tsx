import { useState, type ReactNode } from 'react';
import { View, Switch, Pressable } from 'react-native';
import { usePlatformAction } from './hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AppText, Button, Choice, DateInput, Note, Panel, TextField, sa } from './AdminUI';
export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'bool' | 'date' | 'multiline' | 'password' | 'color';
  required?: boolean;
  options?: [string, string][];
  disabled?: boolean;
}
export type Values = Record<string, string | boolean>;
export function ActionForm({
  title,
  fields,
  initial = {},
  path,
  method = 'post',
  extra,
  children,
  onClose,
  onSaved,
  validate,
}: {
  title: string;
  fields: FormField[];
  initial?: Values;
  path: string;
  method?: 'post' | 'put' | 'delete';
  extra?: Record<string, unknown>;
  children?: ReactNode;
  onClose: () => void;
  onSaved?: () => void;
  validate?: (values: Values) => string | null;
}) {
  const [values, setValues] = useState<Values>(initial),
    [review, setReview] = useState(false);
  const action = usePlatformAction(() => {
    onSaved?.();
    onClose();
  });
  const requiredError = fields.some(
    (f) =>
      f.required &&
      (f.type === 'bool' ? values[f.key] == null : !String(values[f.key] ?? '').trim()),
  );
  const error = validate?.(values);
  const body = () =>
    Object.fromEntries(
      fields
        .filter((f) => !f.disabled)
        .map((f) => [
          f.key,
          f.type === 'number'
            ? values[f.key] === '' || values[f.key] == null
              ? null
              : Number(values[f.key])
            : f.type === 'bool'
              ? !!values[f.key]
              : f.type === 'password'
                ? String(values[f.key] ?? '')
                : String(values[f.key] ?? '').trim(),
        ]),
    );
  return (
    <Panel title={title}>
      {fields.map((f) =>
        f.type === 'bool' ? (
          <View key={f.key} style={sa.row}>
            <AppText style={sa.grow}>{f.label}</AppText>
            <Switch
              accessibilityLabel={f.label}
              value={!!values[f.key]}
              disabled={f.disabled || action.isPending}
              onValueChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
            />
          </View>
        ) : f.type === 'color' ? (
          <View key={f.key} style={{ gap: 8 }}>
            <AppText variant="labelLg">{f.label}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {f.options?.map(([color, label]) => (
                <Pressable
                  key={color}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: values[f.key] === color }}
                  onPress={() => setValues((v) => ({ ...v, [f.key]: color }))}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 24,
                    backgroundColor: color,
                    borderWidth: values[f.key] === color ? 4 : 1,
                    borderColor: values[f.key] === color ? '#0b1c30' : '#dce9ff',
                  }}
                />
              ))}
            </View>
          </View>
        ) : f.options ? (
          <Choice
            key={f.key}
            label={f.label}
            value={String(values[f.key] ?? '')}
            options={f.options}
            onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
          />
        ) : f.type === 'date' ? (
          <DateInput
            key={f.key}
            label={f.label}
            value={String(values[f.key] ?? '')}
            onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
          />
        ) : (
          <TextField
            key={f.key}
            label={`${f.label}${f.required ? ' *' : ''}`}
            value={String(values[f.key] ?? '')}
            editable={!f.disabled && !action.isPending}
            multiline={f.type === 'multiline'}
            secureToggle={f.type === 'password'}
            keyboardType={f.type === 'number' ? 'numeric' : 'default'}
            onChangeText={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
          />
        ),
      )}
      {children}
      {error ? <Note>{error}</Note> : null}
      {action.isError ? <Note>{action.error.message}</Note> : null}
      <View style={sa.row}>
        <Button
          label="Annuler"
          variant="tonal"
          style={sa.grow}
          disabled={action.isPending}
          onPress={onClose}
        />
        <Button
          label="Vérifier les modifications"
          style={sa.grow}
          disabled={requiredError || !!error || action.isPending}
          onPress={() => setReview(true)}
        />
      </View>
      <ConfirmDialog
        visible={review}
        title={title}
        message={`${fields
          .filter((f) => f.type !== 'password')
          .map(
            (f) =>
              `${f.label} : ${f.type === 'bool' ? (values[f.key] ? 'Oui' : 'Non') : (f.options?.find(([k]) => k === values[f.key])?.[1] ?? String(values[f.key] ?? '—'))}`,
          )
          .join('\n')}${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Enregistrer"
        cancelLabel="Revoir"
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setReview(false);
        }}
        onConfirm={() => {
          void action.run({ path, method, body: { ...body(), ...extra } }).catch(() => undefined);
        }}
      />
    </Panel>
  );
}
