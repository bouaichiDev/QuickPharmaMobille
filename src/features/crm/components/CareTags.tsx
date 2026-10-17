import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet } from '@/services/api/client';
import { can } from '../modules';
import { listPayload } from '../crmApi';
export function CareTags({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const access = useAccess();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const selected = value.split('\n').filter(Boolean);
  const query = useQuery({
    queryKey: ['crm', store, 'disease-options'],
    enabled: can(access.data, 'services.clients.view'),
    queryFn: async () =>
      listPayload(await apiGet('/crm-care/references', { params: { kind: 'disease' } })).rows,
  });
  const suggestions = (query.data ?? [])
    .map((row) => String(row.label))
    .filter(
      (label) =>
        !selected.includes(label) && label.toLocaleLowerCase().includes(draft.toLocaleLowerCase()),
    )
    .slice(0, 8);
  const add = (label: string) => {
    if (label.trim() && !selected.includes(label.trim()))
      onChange([...selected, label.trim()].join('\n'));
    setDraft('');
  };
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="labelLg">Maladies & antécédents médicaux</AppText>
      <AppText variant="bodySm" color="outline">
        Sélectionnez une référence ou ajoutez un antécédent.
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {selected.map((label) => (
          <Chip
            key={label}
            label={`${label} ×`}
            selected
            onPress={() => onChange(selected.filter((entry) => entry !== label).join('\n'))}
          />
        ))}
      </View>
      <TextField
        appearance="crm"
        label="Ajouter un antécédent"
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => add(draft)}
      />
      {suggestions.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((label) => (
            <Chip key={label} label={label} onPress={() => add(label)} />
          ))}
        </View>
      ) : null}
      <Button
        label="Ajouter"
        compact
        variant="tonal"
        disabled={!draft.trim()}
        onPress={() => add(draft)}
      />
      {query.isError ? (
        <AppText variant="bodySm" color="outline">
          Référentiel indisponible. Vous pouvez saisir un antécédent.
        </AppText>
      ) : null}
    </View>
  );
}
