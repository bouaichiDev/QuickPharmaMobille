import { useState } from 'react';
import { View } from 'react-native';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePlatformAction, usePlatformList } from './hooks';
import {
  AdminScreen,
  AdminList,
  Panel,
  Pair,
  Note,
  Choice,
  QueryState,
  Pager,
  TextField,
  Button,
  sa,
} from './AdminUI';
type Translation = {
  key: string;
  version: string;
  translations: Record<string, { value: string }>;
};
const languages: [string, string][] = [
  ['fr', 'Français'],
  ['ar', 'Arabe'],
  ['en', 'Anglais'],
  ['es', 'Espagnol'],
];
function TranslationEditor({
  row,
  version,
  onClose,
}: {
  row?: Translation;
  version: string;
  onClose: () => void;
}) {
  const [key, setKey] = useState(row?.key ?? ''),
    [values, setValues] = useState<Record<string, string>>(
      Object.fromEntries(languages.map(([l]) => [l, row?.translations[l]?.value ?? ''])),
    ),
    [review, setReview] = useState(false);
  const action = usePlatformAction(onClose);
  return (
    <Panel title={row ? 'Modifier la traduction' : 'Ajouter une traduction'}>
      <TextField label="Clé" value={key} onChangeText={setKey} editable={!row} />
      <Pair label="Version" value={version} />
      {languages.map(([l, label]) => (
        <TextField
          key={l}
          label={label}
          value={values[l]}
          multiline
          onChangeText={(v) => setValues((s) => ({ ...s, [l]: v }))}
        />
      ))}
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
          label="Vérifier"
          style={sa.grow}
          disabled={!key.trim() || !Object.values(values).some((s) => s.trim())}
          onPress={() => setReview(true)}
        />
      </View>
      <ConfirmDialog
        visible={review}
        title="Enregistrer la traduction"
        message={`${key} · version ${version}\n${languages.map(([l, n]) => `${n} : ${values[l] || '(non renseigné)'}`).join('\n')}${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Enregistrer"
        cancelLabel="Revoir"
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setReview(false);
        }}
        onConfirm={() =>
          void action
            .run({
              method: row ? 'put' : 'post',
              path: row ? `/translations/${encodeURIComponent(row.key)}` : '/translations',
              body: {
                key: key.trim(),
                version,
                translations: row
                  ? values
                  : Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())),
              },
            })
            .catch(() => undefined)
        }
      />
    </Panel>
  );
}
export function Translations() {
  const [search, setSearch] = useState(''),
    [version, setVersion] = useState('2'),
    [language, setLanguage] = useState('fr'),
    [page, setPage] = useState(1),
    [row, setRow] = useState<Translation>(),
    [create, setCreate] = useState(false);
  const term = useDebounce(search),
    query = usePlatformList<Translation>('/listTranslations', { searchValue: term, version, page });
  return (
    <AdminScreen title="Traductions" scroll={!!row || create}>
      {row || create ? (
        <TranslationEditor
          row={row}
          version={version}
          onClose={() => {
            setRow(undefined);
            setCreate(false);
          }}
        />
      ) : (
        <AdminList
          data={query.data?.data ?? []}
          header={
            <>
              <TextField
                label="Rechercher une clé ou un texte"
                value={search}
                onChangeText={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
              />
              <Choice
                label="Version"
                value={version}
                options={[
                  ['1', '1'],
                  ['2', '2'],
                ]}
                onChange={(v) => {
                  setVersion(v);
                  setPage(1);
                }}
              />
              <Choice
                label="Langue affichée"
                value={language}
                options={languages}
                onChange={setLanguage}
              />
              <Button label="Ajouter une traduction" icon="add" onPress={() => setCreate(true)} />
              <QueryState query={query} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={item.key}>
              <Note>{item.translations[language]?.value || 'Traduction manquante'}</Note>
              <Button label="Modifier les langues" variant="tonal" onPress={() => setRow(item)} />
            </Panel>
          )}
          footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
        />
      )}
    </AdminScreen>
  );
}
