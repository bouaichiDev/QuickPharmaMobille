import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { currency, DateInput } from '@/features/superadmin/AdminUI';
import { useSessionStore } from '@/features/auth/sessionStore';
import { commerceApi, number } from './api';
import {
  AccessGate,
  AppText,
  Badge,
  Button,
  Card,
  CommerceScreen,
  ErrorState,
  Notice,
  Pair,
  ReferenceSelect,
  ResponsiveGrid,
  TextField,
  ui,
  useCommerceAccess,
} from './CommerceUI';
import { fastPayload, type FastLine } from './entryModel';
import { ProductPicker } from './EntryForm';

export default function FastEntry({ onClose }: { onClose: () => void }) {
  const { store, can } = useCommerceAccess(),
    user = useSessionStore((s) => s.session?.userId),
    qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [rows, setRows] = useState<FastLine[]>([]),
    [edit, setEdit] = useState<number>(),
    [clear, setClear] = useState(false),
    [leave, setLeave] = useState(false),
    [confirm, setConfirm] = useState(false),
    [notice, setNotice] = useState(''),
    [success, setSuccess] = useState(false);
  const key = `quickpharma-fast-entry:${user}:${store}`;
  const [limit, setLimit] = useState(20),
    [removed, setRemoved] = useState<FastLine>();
  const summary = rows.reduce(
    (a, r) => ({ total: a.total + r.quantity * r.buying_price, paid: a.paid + r.paid_amount }),
    { total: 0, paid: 0 },
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!can('entries.create')) throw new Error('Action non autorisée.');
      return commerceApi.write('post', '/entrees/fast', fastPayload(date, rows));
    },
    onSuccess: async () => {
      setConfirm(false);
      setSuccess(true);
      await AsyncStorage.removeItem(key);
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['commerce'] }),
        qc.invalidateQueries({ queryKey: ['stock'] }),
        qc.invalidateQueries({ queryKey: ['products'] }),
      ]);
    },
    retry: false,
  });
  async function draft(load = false) {
    try {
      if (load) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) {
          setNotice('Aucun brouillon pour ce magasin.');
          return;
        }
        const data = JSON.parse(raw);
        if (!Array.isArray(data.rows) || data.rows.length > 200)
          throw new Error('Brouillon invalide.');
        setRows(data.rows);
        setDate(data.date);
        setNotice('Brouillon chargé.');
      } else {
        await AsyncStorage.setItem(key, JSON.stringify({ rows, date }));
        setNotice('Brouillon enregistré sur cet appareil pour ce magasin.');
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Brouillon indisponible.');
    }
  }
  if (success)
    return (
      <CommerceScreen title="Saisie rapide" onBack={onClose}>
        <Card title="Entrées enregistrées" icon="check-circle-outline">
          <Badge>{rows.length} ligne(s)</Badge>
          <Pair label="Total" value={currency(summary.total)} />
          <Pair label="Payé" value={currency(summary.paid)} />
          <Pair label="Reste impayé" value={currency(summary.total - summary.paid)} />
          <Button label="Retour aux entrées" onPress={onClose} />
        </Card>
      </CommerceScreen>
    );
  return (
    <CommerceScreen
      title="Saisie rapide d’entrée"
      onBack={() => !save.isPending && (rows.length ? setLeave(true) : onClose())}
    >
      <AccessGate permission="entries.create">
        <View style={ui.row}>
          <AppText variant="headlineSm" style={ui.grow}>
            Approvisionnement express
          </AppText>
          <Button
            label="Ajouter une ligne"
            icon="add"
            compact
            fullWidth={false}
            onPress={() => setEdit(-1)}
            disabled={rows.length >= 200}
          />
        </View>
        <DateInput label="Date commune des entrées" value={date} onChange={setDate} />
        <Card title="Récapitulatif financier" icon="payments">
          <ResponsiveGrid maxColumns={3}>
            <View style={ui.inset}>
              <AppText variant="labelSm">Montant total</AppText>
              <AppText variant="headlineSm" color="primary">
                {currency(summary.total)}
              </AppText>
            </View>
            <View style={ui.inset}>
              <AppText variant="labelSm">Montant payé</AppText>
              <AppText variant="headlineSm" color="secondary">
                {currency(summary.paid)}
              </AppText>
            </View>
            <View style={ui.inset}>
              <AppText variant="labelSm">Reste impayé</AppText>
              <AppText variant="headlineSm" color="error">
                {currency(summary.total - summary.paid)}
              </AppText>
            </View>
          </ResponsiveGrid>
        </Card>
        <ResponsiveGrid maxColumns={3}>
          {rows.slice(0, limit).map((r, i) => (
            <Card key={i}>
              <View style={ui.row}>
                <AppText variant="headlineSm" style={ui.grow}>
                  #{i + 1} · {r.product_name}
                </AppText>
                <Button
                  label="Modifier"
                  icon="edit"
                  compact
                  fullWidth={false}
                  variant="ghost"
                  onPress={() => setEdit(i)}
                />
              </View>
              <AppText variant="bodySm" color="outline">
                {r.brand_name ? [r.brand_name, r.provider_name].join(' · ') : r.provider_name}
              </AppText>
              <View style={ui.inset}>
                <Pair
                  label={`${r.quantity} unités × ${currency(r.buying_price)}`}
                  value={currency(r.quantity * r.buying_price)}
                />
              </View>
              <Badge danger={r.paid_amount < r.quantity * r.buying_price}>
                {r.paid_amount >= r.quantity * r.buying_price
                  ? 'Payé'
                  : `Acompte : ${currency(r.paid_amount)}`}
              </Badge>
              <Button
                label="Retirer"
                icon="delete-outline"
                compact
                variant="dangerSoft"
                onPress={() => {
                  setRemoved(r);
                  setRows(rows.filter((_, idx) => idx !== i));
                  setNotice('Ligne retirée. Le stock n’est pas encore modifié.');
                }}
              />
            </Card>
          ))}
        </ResponsiveGrid>
        {rows.length > limit ? (
          <Button
            label="Afficher les lignes suivantes"
            variant="tonal"
            onPress={() => setLimit(limit + 20)}
          />
        ) : null}
        {removed ? (
          <Button
            label={`Annuler le retrait : ${removed.product_name}`}
            variant="outline"
            onPress={() => {
              setRows((current) => [...current, removed]);
              setRemoved(undefined);
            }}
          />
        ) : null}
        {!rows.length ? (
          <Notice>
            Ajoutez les produits à réceptionner. Chaque ligne sera enregistrée comme une entrée
            distincte, comme sur le web.
          </Notice>
        ) : null}
        {notice ? <Notice>{notice}</Notice> : null}
        {save.isError ? <ErrorState error={save.error} /> : null}
        <Button
          label={`Valider et enregistrer ${rows.length} ligne(s)`}
          icon="check-circle-outline"
          loading={save.isPending}
          disabled={!rows.length}
          onPress={() => setConfirm(true)}
        />
        <ResponsiveGrid maxColumns={3}>
          <Button
            label="Enregistrer le brouillon"
            variant="tonal"
            disabled={save.isPending || !rows.length}
            onPress={() => void draft()}
          />
          <Button
            label="Charger le brouillon"
            variant="outline"
            disabled={save.isPending}
            onPress={() => void draft(true)}
          />
          <Button
            label="Vider la liste"
            variant="dangerSoft"
            disabled={save.isPending || !rows.length}
            onPress={() => setClear(true)}
          />
        </ResponsiveGrid>
        {edit !== undefined ? (
          <FastLineEditor
            row={edit >= 0 ? rows[edit] : undefined}
            onClose={() => setEdit(undefined)}
            onSave={(r) => {
              setRows(edit >= 0 ? rows.map((old, i) => (i === edit ? r : old)) : [...rows, r]);
              setEdit(undefined);
            }}
          />
        ) : null}
        <ConfirmDialog
          visible={confirm}
          title="Confirmer l’approvisionnement ?"
          message={`${rows.length} ligne(s), total ${currency(summary.total)}. Les noms de produits ou fournisseurs inconnus peuvent créer de nouvelles fiches, comme sur le web.`}
          confirmLabel="Enregistrer"
          cancelLabel="Vérifier"
          loading={save.isPending}
          onConfirm={() => save.mutate()}
          onCancel={() => !save.isPending && setConfirm(false)}
        />
        <ConfirmDialog
          visible={clear}
          title="Vider la saisie ?"
          message="Les lignes non enregistrées seront retirées."
          confirmLabel="Vider"
          cancelLabel="Annuler"
          destructive
          onConfirm={() => {
            setRows([]);
            setClear(false);
          }}
          onCancel={() => setClear(false)}
        />
        <ConfirmDialog
          visible={leave}
          title="Quitter la saisie rapide ?"
          message="Enregistrez un brouillon avant de quitter pour conserver les lignes sur cet appareil."
          confirmLabel="Quitter"
          cancelLabel="Continuer"
          onConfirm={onClose}
          onCancel={() => setLeave(false)}
        />
      </AccessGate>
    </CommerceScreen>
  );
}
function FastLineEditor({
  row,
  onClose,
  onSave,
}: {
  row?: FastLine;
  onClose: () => void;
  onSave: (r: FastLine) => void;
}) {
  const [product, setProduct] = useState(row?.product_name ?? ''),
    [provider, setProvider] = useState(row?.provider_name ?? ''),
    [providerId, setProviderId] = useState(''),
    [brand, setBrand] = useState(row?.brand_name ?? ''),
    [qty, setQty] = useState(String(row?.quantity ?? 1)),
    [price, setPrice] = useState(String(row?.buying_price ?? 0)),
    [paid, setPaid] = useState(String(row?.paid_amount ?? 0)),
    [error, setError] = useState(''),
    [picker, setPicker] = useState(false);
  return (
    <SelectionDialog
      visible
      title={row ? 'Modifier la ligne' : 'Ajouter une ligne'}
      onClose={onClose}
    >
      <TextField label="Produit *" value={product} onChangeText={setProduct} />
      <Button
        label="Rechercher dans le catalogue"
        icon="search"
        variant="tonal"
        onPress={() => setPicker(true)}
      />
      <TextField label="Marque (facultatif)" value={brand} onChangeText={setBrand} />
      <TextField label="Quantité *" value={qty} onChangeText={setQty} keyboardType="number-pad" />
      <TextField
        label="Prix d’achat unitaire (DH) *"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      <ReferenceSelect
        label="Choisir un fournisseur existant"
        path="/providerDropdown"
        value={providerId}
        onChange={(v, r) => {
          setProviderId(v);
          setProvider(String(r.name ?? ''));
        }}
      />
      <TextField label="Nom du fournisseur *" value={provider} onChangeText={setProvider} />
      <TextField
        label="Montant payé (DH) *"
        value={paid}
        onChangeText={setPaid}
        keyboardType="decimal-pad"
      />
      <Pair label="Total ligne" value={currency(number(qty) * number(price.replace(',', '.')))} />
      {error ? <Notice>{error}</Notice> : null}
      <Button
        label="Fixer la ligne"
        icon="save"
        onPress={() => {
          const r: FastLine = {
            product_name: product.trim(),
            provider_name: provider.trim(),
            quantity: Number(qty),
            buying_price: Number(price.replace(',', '.')),
            paid_amount: Number(paid.replace(',', '.')),
            status: 'unpaid',
            ...(brand.trim() ? { brand_name: brand.trim() } : {}),
          };
          try {
            fastPayload(new Date().toISOString().slice(0, 10), [r]);
            onSave(r);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Ligne invalide.');
          }
        }}
      />
      {picker ? (
        <ProductPicker
          onClose={() => setPicker(false)}
          onSelect={(p) => {
            setProduct(p.productName);
            setPrice(String(p.buyingPrice ?? 0));
            setPicker(false);
          }}
        />
      ) : null}
    </SelectionDialog>
  );
}
