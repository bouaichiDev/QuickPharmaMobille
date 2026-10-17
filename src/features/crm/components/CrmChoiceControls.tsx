import { Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';

const palette: [string, string][] = [
  ['Turquoise', '#00b8cf'],
  ['Bleu', '#0a58a3'],
  ['Vert lagon', '#1cb5a9'],
  ['Orange', '#f59e0b'],
  ['Violet', '#8854f6'],
  ['Rose', '#ec4899'],
  ['Vert', '#16a34a'],
  ['Rouge', '#dc2626'],
  ['Indigo', '#4f46e5'],
  ['Prune', '#9333ea'],
  ['Brun', '#92400e'],
  ['Gris', '#64748b'],
];
export function CrmColorPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const choices: [string, string][] =
    palette.some(([, color]) => color === value.toLowerCase()) || !/^#[a-f\d]{6}$/i.test(value)
      ? palette
      : [...palette, ['Couleur actuelle', value]];
  return (
    <View style={{ gap: 12 }}>
      <AppText variant="bodySm" color="outline">
        Choisissez une couleur pour le planning.
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {choices.map(([name, color]) => (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ selected: value.toLowerCase() === color.toLowerCase() }}
            onPress={() => onChange(color)}
            style={{ width: 72, alignItems: 'center', gap: 5 }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: color,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: value.toLowerCase() === color.toLowerCase() ? 3 : 0,
                borderColor: '#102033',
              }}
            >
              {value.toLowerCase() === color.toLowerCase() ? (
                <Icon name="check" color="onPrimary" size={23} />
              ) : null}
            </View>
            <AppText variant="labelSm">{name}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function CrmSessionCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const count = Math.max(1, Number(value) || 1);
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="labelLg">{label}</AppText>
      <View
        style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 6,
          borderRadius: 12,
          backgroundColor: '#eff4ff',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retirer une séance"
          disabled={count <= 1}
          onPress={() => onChange(String(Math.max(1, count - 1)))}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: '#fff',
            opacity: count <= 1 ? 0.4 : 1,
          }}
        >
          <Icon name="remove" color="primary" />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
          onBlur={() => onChange(String(count))}
          keyboardType="number-pad"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: '600',
            color: '#102033',
          }}
        />
        <AppText variant="bodySm">séances</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter une séance"
          onPress={() => onChange(String(count + 1))}
          style={{ padding: 8, borderRadius: 8, backgroundColor: '#fff' }}
        >
          <Icon name="add" color="primary" />
        </Pressable>
      </View>
    </View>
  );
}
