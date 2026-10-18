import { View } from 'react-native';
import { TextField } from './TextField';
import { Button } from './Button';

export function SearchFilterRow({
  label,
  placeholder,
  value,
  onChangeText,
  onFilterPress,
  filterLabel = 'Filtres',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  onFilterPress: () => void;
  filterLabel?: string;
}) {
  return (
    <View
      testID="search-filter-row"
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <TextField
          label={label}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
      <Button
        label={filterLabel}
        icon="tune"
        variant="tonal"
        fullWidth={false}
        style={{ minHeight: 48 }}
        onPress={onFilterPress}
      />
    </View>
  );
}
