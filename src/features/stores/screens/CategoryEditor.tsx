import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StockPage, SCard, SField, SButton, SNote, st } from '@/features/catalogue/StockDesign';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { categoriesApi, type Category } from '../categoriesApi';

export function CategoryEditor({
  category,
  readOnly = false,
  onClose,
}: {
  category?: Category;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [code, setCode] = useState(category?.code || '');
  const [description, setDescription] = useState(category?.description || '');
  const [active, setActive] = useState(category ? category.active === 1 : true);
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: () => categoriesApi.save({ name, code, description, active }, category?.id),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['categories'] }),
        cache.invalidateQueries({ queryKey: ['catalogue'] }),
        cache.invalidateQueries({ queryKey: ['products'] }),
      ]);
      onClose();
    },
  });
  const valid = !!name.trim() && !!code.trim() && !!description.trim();
  return (
    <StockPage
      title={
        readOnly
          ? 'Détail de la catégorie'
          : category
            ? 'Modifier la catégorie'
            : 'Nouvelle catégorie'
      }
      onClose={() => {
        if (!save.isPending) onClose();
      }}
      footer={
        !readOnly ? (
          <View style={st.row}>
            <View style={st.grow}>
              <SButton label="Annuler" secondary disabled={save.isPending} onPress={onClose} />
            </View>
            <View style={st.grow}>
              <SButton
                label="Enregistrer"
                icon="save"
                busy={save.isPending}
                disabled={!valid || save.isPending}
                onPress={() => save.mutate()}
              />
            </View>
          </View>
        ) : undefined
      }
    >
      <SCard>
        {readOnly ? (
          <>
            <AppText variant="headlineSm">{name}</AppText>
            <AppText>{code}</AppText>
            <AppText>{description || 'Aucune description'}</AppText>
            <AppText>{active ? 'Active' : 'Inactive'}</AppText>
          </>
        ) : (
          <>
            <SField label="Nom *" value={name} onChange={setName} />
            <SField label="Code *" value={code} onChange={setCode} />
            <SField label="Description *" value={description} onChange={setDescription} multiline />
            <View style={st.row}>
              <AppText style={st.grow}>Catégorie active</AppText>
              <Switch
                accessibilityLabel="Catégorie active"
                value={active}
                onValueChange={setActive}
                disabled={save.isPending}
              />
            </View>
            <SNote>Les champs marqués * sont obligatoires.</SNote>
          </>
        )}
      </SCard>
      {save.isError ? <ErrorState error={save.error} /> : null}
    </StockPage>
  );
}
