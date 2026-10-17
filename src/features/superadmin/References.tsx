import { useState } from 'react';
import { STabs, useDebounce } from '@/features/catalogue/StockDesign';
import { usePlatformList } from './hooks';
import {
  AdminScreen,
  AdminList,
  Panel,
  Pair,
  Note,
  QueryState,
  Pager,
  TextField,
  Button,
} from './AdminUI';
import { ActionForm, type FormField } from './ActionForm';
import type { Row } from './api';
const palette: [string, string][] = [
  ['#00417c', 'Bleu foncé'],
  ['#006a63', 'Turquoise'],
  ['#dce9ff', 'Bleu clair'],
  ['#72f4e7', 'Menthe'],
  ['#ffdad6', 'Rose clair'],
  ['#ba1a1a', 'Rouge'],
  ['#f59e0b', 'Orange'],
  ['#8b5cf6', 'Violet'],
];
export function References() {
  const [kind, setKind] = useState('statuses'),
    [search, setSearch] = useState(''),
    [src, setSrc] = useState(''),
    [page, setPage] = useState(1),
    [edit, setEdit] = useState<Row>(),
    [create, setCreate] = useState(false);
  const term = useDebounce(search),
    source = useDebounce(src),
    query = usePlatformList<Row>(`/superadmin/mobile/references/${kind}`, {
      search: term,
      src: source,
      page,
    });
  const path =
    kind === 'statuses'
      ? `/status${edit ? `/${edit.id}` : ''}`
      : kind === 'types'
        ? edit
          ? `/types/update/${edit.id}`
          : '/types/create'
        : `/icon${edit ? `/${edit.id}` : ''}`;
  const fields: FormField[] = [
    { key: 'label', label: 'Libellé', required: true },
    ...(kind !== 'icons'
      ? [
          { key: 'code', label: 'Code', required: true },
          { key: 'src', label: 'Module / source', required: true },
        ]
      : [
          {
            key: 'icon',
            label: 'Icône',
            required: true,
            options: [
              'store',
              'inventory_2',
              'receipt_long',
              'check_circle',
              'error',
              'medical_services',
              'person',
            ].map((k) => [k, k] as [string, string]),
          },
        ]),
    ...(kind === 'statuses'
      ? [
          {
            key: 'background_color',
            label: 'Couleur du statut',
            required: true,
            type: 'color' as const,
            options: palette,
          },
        ]
      : kind === 'icons'
        ? [
            {
              key: 'color',
              label: 'Couleur',
              required: true,
              type: 'color' as const,
              options: palette,
            },
            {
              key: 'backColor',
              label: 'Fond',
              required: true,
              type: 'color' as const,
              options: palette,
            },
          ]
        : []),
  ];
  return (
    <AdminScreen title="Configuration & référentiels" scroll={!!edit || create}>
      {edit || create ? (
        <ActionForm
          key={`${kind}-${edit?.id ?? 'new'}`}
          title={edit ? 'Modifier le référentiel' : 'Ajouter un référentiel'}
          fields={fields}
          initial={Object.fromEntries(fields.map((f) => [f.key, String(edit?.[f.key] ?? '')]))}
          extra={edit && kind === 'statuses' ? { id: edit.id } : undefined}
          path={path}
          method={edit ? 'put' : 'post'}
          onClose={() => {
            setEdit(undefined);
            setCreate(false);
          }}
        />
      ) : (
        <AdminList
          data={query.data?.data ?? []}
          header={
            <>
              <STabs
                value={kind}
                onChange={(v) => {
                  setKind(v);
                  setPage(1);
                }}
                values={[
                  ['statuses', 'Statuts'],
                  ['types', 'Types'],
                  ['icons', 'Icônes'],
                ]}
              />
              <TextField
                label="Rechercher un libellé"
                value={search}
                onChangeText={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
              />
              {kind !== 'icons' ? (
                <TextField
                  label="Source / module"
                  value={src}
                  onChangeText={(v) => {
                    setSrc(v);
                    setPage(1);
                  }}
                />
              ) : null}
              <Button label="Ajouter" icon="add" onPress={() => setCreate(true)} />
              <Note>
                Référentiels de la plateforme. Les statuts propres à un magasin ne figurent pas dans
                cette liste.
              </Note>
              <QueryState query={query} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={String(item.label ?? '')}>
              <Pair label="Code" value={item.code ?? item.icon} />
              <Pair label="Source" value={item.src} />
              <Button label="Modifier" variant="tonal" onPress={() => setEdit(item)} />
            </Panel>
          )}
          footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
        />
      )}
    </AdminScreen>
  );
}
