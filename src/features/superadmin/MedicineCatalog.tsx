import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { stockRequestId } from '@/features/catalogue/productInventoryApi';
import { httpClient } from '@/services/api/client';
import { platformApi, payload, type Page } from './api';
import { usePlatformGet, usePlatformPermission } from './hooks';
import { TenantPicker } from './Governance';
import {
  AdminScreen,
  AdminList,
  Panel,
  Pair,
  Tag,
  Note,
  Choice,
  QueryState,
  Pager,
  TextField,
  Button,
  currency,
} from './AdminUI';
interface Medicine {
  id: number;
  name: string;
  catalog_reference: string;
  ean13: string | null;
  ppv: string | null;
  ph: string | null;
  dosage: string | null;
  active_substance: string | null;
  form: string | null;
  presentation: string | null;
  marketing_status: string | null;
}
interface Response {
  rows: Medicine[];
  meta: Omit<Page<Medicine>, 'data'>;
  categories: { id: number; name: string }[];
  marketing_statuses: string[];
  stats: { total: number; with_ean13: number };
}
interface Preview {
  fingerprint: string;
  selected: number;
  to_create: number;
  skipped: number;
  store: { name: string };
  items: { id: number; name: string; reason: string | null }[];
}
function CatalogImport({ ids, onClose }: { ids: number[]; onClose: () => void }) {
  const [store, setStore] = useState<number>(),
    [name, setName] = useState(''),
    [type, setType] = useState(''),
    [status, setStatus] = useState(''),
    [price, setPrice] = useState('0'),
    [preview, setPreview] = useState<Preview>(),
    [confirm, setConfirm] = useState(false);
  const options = usePlatformGet<{
    types: { id: number; label: string }[];
    statuses: { id: number; label: string }[];
  }>('/superadmin/medicine-catalog/import-options', { target_store_id: store }, !!store);
  const key = useRef(stockRequestId()),
    body = {
      medicine_ids: ids,
      target_store_id: store,
      type_id: Number(type),
      status_id: Number(status),
      buying_price: Number(price),
    };
  const check = useMutation({
    mutationFn: () =>
      platformApi.write<Preview>('post', '/superadmin/medicine-catalog/import-preview', body),
    onSuccess: setPreview,
    retry: false,
  });
  const save = useMutation({
    mutationFn: async () => {
      const res = await httpClient.post(
        '/superadmin/medicine-catalog/import',
        { ...body, fingerprint: preview?.fingerprint, request_key: key.current },
        { skipStoreContext: true, timeout: 180000 },
      );
      return payload(res.data);
    },
    retry: false,
    onSuccess: () => {
      setConfirm(false);
      onClose();
    },
  });
  const reset = () => {
    setPreview(undefined);
    key.current = stockRequestId();
  };
  return (
    <>
      <Button
        label="Retour au catalogue"
        variant="ghost"
        disabled={save.isPending}
        onPress={onClose}
      />
      <Panel title={`Importer ${ids.length} références`}>
        <TenantPicker
          title={name || 'Choisir le magasin destinataire'}
          onSelect={(s) => {
            setStore(s.store_id);
            setName(s.name);
            setType('');
            setStatus('');
            reset();
          }}
        />
        <QueryState query={options} />
        <Choice
          label="Type de produit"
          value={type}
          options={(options.data?.types ?? []).map((t) => [String(t.id), t.label])}
          onChange={(v) => {
            setType(v);
            reset();
          }}
        />
        <Choice
          label="Statut"
          value={status}
          options={(options.data?.statuses ?? []).map((t) => [String(t.id), t.label])}
          onChange={(v) => {
            setStatus(v);
            reset();
          }}
        />
        <TextField
          label="Prix d’achat initial"
          value={price}
          keyboardType="decimal-pad"
          onChangeText={(v) => {
            setPrice(v);
            reset();
          }}
        />
        <Button
          label="Prévisualiser l’import"
          disabled={
            !store ||
            !type ||
            !status ||
            price.trim() === '' ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
          }
          loading={check.isPending}
          onPress={() => check.mutate()}
        />
        {check.isError ? <Note>{check.error.message}</Note> : null}
      </Panel>
      {preview ? (
        <Panel title="Récapitulatif">
          <Pair label="Magasin" value={preview.store.name} />
          <Pair label="À créer" value={preview.to_create} />
          <Pair label="Ignorés" value={preview.skipped} />
          <Note>
            Les références déjà importées et les doublons sont ignorés. Aucun stock physique n’est
            ajouté par cet import de références.
          </Note>
          {preview.items
            .filter((i) => i.reason)
            .slice(0, 25)
            .map((i) => (
              <Pair
                key={i.id}
                label={i.name}
                value={
                  i.reason === 'already_imported'
                    ? 'Déjà importé'
                    : i.reason === 'missing_ppv'
                      ? 'Prix public manquant'
                      : 'Référence existante ou doublon'
                }
              />
            ))}
          <Button
            label="Confirmer l’import"
            disabled={!preview.to_create}
            loading={save.isPending}
            onPress={() => setConfirm(true)}
          />
        </Panel>
      ) : null}
      <ConfirmDialog
        visible={confirm}
        title="Importer dans le magasin"
        message={`${preview?.store.name} · ${preview?.to_create} références à créer.${save.error ? `\n${save.error.message}` : ''}`}
        confirmLabel="Importer"
        cancelLabel="Annuler"
        loading={save.isPending}
        onCancel={() => {
          if (!save.isPending) setConfirm(false);
        }}
        onConfirm={() => {
          if (!save.isPending) save.mutate();
        }}
      />
    </>
  );
}
export function MedicineCatalog() {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [barcode, setBarcode] = useState('all'),
    [marketing, setMarketing] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<number[]>([]),
    [detail, setDetail] = useState<Medicine>(),
    [importing, setImporting] = useState(false);
  const term = useDebounce(search),
    filters = { search: term, category_id: category, barcode, marketing_status: marketing };
  const query = usePlatformGet<Response>('/superadmin/medicine-catalog', {
    ...filters,
    page,
    per_page: 25,
  });
  const canImport = usePlatformPermission('platform.tenants.manage');
  const download = useMutation({
    mutationFn: async () => {
      const res = await httpClient.get<string>('/superadmin/medicine-catalog/export', {
        skipStoreContext: true,
        params: filters,
        responseType: 'text',
      });
      if (!String(res.headers['content-type']).includes('text/csv'))
        throw new Error('Le serveur n’a pas renvoyé un fichier CSV.');
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'catalogue-ammps.csv';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const [{ File, Paths }, Sharing] = await Promise.all([
          import('expo-file-system'),
          import('expo-sharing'),
        ]);
        if (!(await Sharing.isAvailableAsync())) throw new Error('Partage indisponible.');
        const file = new File(Paths.cache, 'catalogue-ammps.csv');
        file.write(res.data);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exporter le catalogue',
        });
      }
    },
    retry: false,
  });
  const result = query.data ? { ...query.data.meta, data: query.data.rows } : undefined;
  return (
    <AdminScreen title="Catalogue central des médicaments" scroll={importing || !!detail}>
      {importing ? (
        <CatalogImport
          ids={selected}
          onClose={() => {
            setImporting(false);
            setSelected([]);
          }}
        />
      ) : detail ? (
        <>
          <Button
            label="Retour au catalogue"
            variant="ghost"
            onPress={() => setDetail(undefined)}
          />
          <Panel title={detail.name}>
            <Tag label={detail.catalog_reference} />
            {[
              ['Code-barres', detail.ean13 ?? 'Non renseigné'],
              ['Dosage', detail.dosage],
              ['Substance active', detail.active_substance],
              ['Forme', detail.form],
              ['Présentation', detail.presentation],
              ['Commercialisation', detail.marketing_status],
              ['Prix public', currency(detail.ppv)],
              ['Prix hospitalier', currency(detail.ph)],
            ].map(([k, v]) => (
              <Pair key={k} label={String(k)} value={v} />
            ))}
          </Panel>
        </>
      ) : (
        <AdminList
          data={query.data?.rows ?? []}
          header={
            <>
              <TextField
                label="Nom, substance, CIP / code-barres"
                value={search}
                onChangeText={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
              />
              <Choice
                label="Catégorie"
                value={category}
                options={[
                  ['', 'Toutes'],
                  ...(query.data?.categories ?? []).map(
                    (c) => [String(c.id), c.name] as [string, string],
                  ),
                ]}
                onChange={(v) => {
                  setCategory(v);
                  setPage(1);
                }}
              />
              <Choice
                label="Code-barres"
                value={barcode}
                options={[
                  ['all', 'Tous'],
                  ['with', 'Avec code-barres'],
                  ['without', 'Sans code-barres'],
                ]}
                onChange={(v) => {
                  setBarcode(v);
                  setPage(1);
                }}
              />
              <Choice
                label="Commercialisation"
                value={marketing}
                options={[
                  ['', 'Tous'],
                  ...(query.data?.marketing_statuses ?? []).map((s) => [s, s] as [string, string]),
                ]}
                onChange={(v) => {
                  setMarketing(v);
                  setPage(1);
                }}
              />
              <Button
                label="Exporter le résultat en CSV"
                variant="tonal"
                loading={download.isPending}
                onPress={() => download.mutate()}
              />
              {download.isError ? <Note>{download.error.message}</Note> : null}
              {canImport ? (
                <>
                  <Note>
                    {selected.length} références sélectionnées. Maximum 1 000 par import mobile.
                  </Note>
                  <Button
                    label="Importer la sélection dans un magasin"
                    disabled={!selected.length}
                    onPress={() => setImporting(true)}
                  />
                  <Button
                    label="Vider la sélection"
                    variant="ghost"
                    disabled={!selected.length}
                    onPress={() => setSelected([])}
                  />
                </>
              ) : null}
              <QueryState query={query} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={item.name}>
              <Tag label={item.catalog_reference} />
              <Pair label="Code-barres" value={item.ean13 ?? 'Non renseigné'} />
              <Pair label="Prix public" value={currency(item.ppv)} />
              {canImport ? (
                <Checkbox
                  label="Sélectionner"
                  checked={selected.includes(item.id)}
                  onChange={(checked) =>
                    setSelected((ids) =>
                      checked
                        ? [...new Set([...ids, item.id])].slice(0, 1000)
                        : ids.filter((id) => id !== item.id),
                    )
                  }
                />
              ) : null}
              <Button label="Voir le détail" variant="tonal" onPress={() => setDetail(item)} />
            </Panel>
          )}
          footer={<Pager result={result} setPage={setPage} busy={query.isFetching} />}
        />
      )}
    </AdminScreen>
  );
}
