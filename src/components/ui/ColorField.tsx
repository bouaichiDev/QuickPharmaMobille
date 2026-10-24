import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { TextField } from './TextField';
import { SelectionDialog } from './SelectionDialog';

export const isHexColor = (value: string) => /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value);
const palette = [
  '#01509d',
  '#0b4778',
  '#2563eb',
  '#60a5fa',
  '#dbeafe',
  '#047857',
  '#059669',
  '#14b8a6',
  '#86efac',
  '#d1fae5',
  '#7c3aed',
  '#a855f7',
  '#ec4899',
  '#f9a8d4',
  '#ede9fe',
  '#b91c1c',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#fef3c7',
  '#000000',
  '#201e1e',
  '#475569',
  '#94a3b8',
  '#ffffff',
];

export function ColorField({
  label,
  value,
  onChange,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const valid = isHexColor(draft);
  return (
    <>
      <TextField
        label={label}
        value={value}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChange}
        error={isHexColor(value) ? undefined : 'Code attendu : #RRGGBB'}
        labelAccessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choisir la couleur ${label}`}
            disabled={!editable}
            onPress={() => {
              setDraft(value);
              setOpen(true);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#94a3b8',
                backgroundColor: isHexColor(value) ? value : '#ffffff',
              }}
            />
            <AppText variant="bodySm">Choisir</AppText>
          </Pressable>
        }
      />
      <SelectionDialog visible={open} title={label} onClose={() => setOpen(false)}>
        <View
          style={{
            height: 64,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#94a3b8',
            backgroundColor: valid ? draft : '#ffffff',
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {palette.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`Couleur ${color}`}
              accessibilityState={{ selected: draft.toLowerCase() === color }}
              onPress={() => setDraft(color)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: color,
                borderWidth: draft.toLowerCase() === color ? 3 : 1,
                borderColor: draft.toLowerCase() === color ? '#01509d' : '#94a3b8',
              }}
            />
          ))}
        </View>
        <TextField
          label="Code hexadécimal"
          value={draft}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setDraft}
          error={valid ? undefined : 'Code attendu : #RRGGBB'}
        />
        <Button
          label="Appliquer la couleur"
          disabled={!valid}
          onPress={() => {
            onChange(draft);
            setOpen(false);
          }}
        />
      </SelectionDialog>
    </>
  );
}
