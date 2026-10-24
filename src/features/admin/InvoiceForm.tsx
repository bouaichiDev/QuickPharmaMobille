import { useState } from 'react';
import { View } from 'react-native';
import { itemId, record } from '@/features/crm/crmApi';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { ReferenceSelect, CommerceList, Pair } from '@/features/commerce/CommerceUI';
import { currency, date, DateInput } from '@/features/superadmin/AdminUI';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { adminApi, asRecord, asRows, useAdminQuery, useAdminAction, type Row } from './api';
import { useAdminList } from './useAdminList';
import { invoiceLine, invoicePreview } from './invoiceModel';
import {
  AdminPage,
  Panel,
  Fold,
  AppText,
  TextField,
  Button,
  Toggle,
  Tabs,
  Notice,
  useDirtyBack,
  useCommerceAccess,
  design,
} from './AdminDesign';
export default function InvoiceForm({
  mode,
  row,
  onBack,
  onSaved,
  addTo,
}: {
  mode: 'manual' | 'sales';
  row?: Row;
  onBack: () => void;
  onSaved: (id?: string) => void;
  addTo?: string;
}) {
  const { can } = useCommerceAccess();
  const editing = !!row?.id && !addTo;
  const permission = addTo
    ? 'invoices.group_sales'
    : editing
      ? 'invoices.update'
      : mode === 'manual'
        ? 'invoices.create_manual'
        : 'invoices.create_from_sale';
  const [step, setStep] = useState(addTo ? 2 : 1),
    [dirty, setDirty] = useState(false),
    [form, setForm] = useState<Row>({
      customer_id: String(row?.customer_id ?? ''),
      type_id: String(row?.type_id ?? ''),
      status_id: String(row?.status_id ?? ''),
      invoice_date: String(row?.invoice_date ?? new Date().toISOString()).slice(0, 10),
      notes: String(row?.notes ?? ''),
      discount_type: row?.discount_type ?? 'percent',
      discount_value: String(row?.discount_value ?? 0),
    }),
    [lines, setLines] = useState<Row[]>(Array.isArray(row?.items) ? row.items.map(record) : []),
    [line, setLine] = useState<Row>(),
    [lineIndex, setLineIndex] = useState(-1),
    [selected, setSelected] = useState<Record<string, Row>>({}),
    [search, setSearch] = useState(''),
    [error, setError] = useState('');
  const term = useDebounce(search);
  const leave = useDirtyBack(dirty, onBack),
    settings = useAdminQuery(
      '/invoice-settings',
      {},
      can('invoices.settings.manage') ? 'invoices.settings.manage' : 'invoices.view',
      mode === 'manual',
    ),
    statuses = useAdminQuery('/statuses', { src: 'invoice', page: 1, per_page: 50 }, permission);
  const settingsRow = settings.data ? asRecord(settings.data) : {};
  const statusRows = statuses.data ? asRows(statuses.data) : [];
  const draft = statusRows.find((s) => String(s.code).toLowerCase() === 'draft');
  const effective: Row = { ...form, status_id: form.status_id || (draft ? itemId(draft) : '') };
  const available = useAdminList(
    '/invoices/unbilled-sales',
    { customer_id: form.customer_id, search: term },
    permission,
    mode === 'sales' && (!editing || !!addTo),
    'sales',
  );
  const update = (key: string, value: unknown) => {
    setDirty(true);
    setForm({ ...form, [key]: value });
    if (key === 'customer_id') setSelected({});
  };
  const action = useAdminAction(
    permission,
    async () => {
      if (
        !effective.customer_id ||
        !effective.status_id ||
        !effective.type_id ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(form.invoice_date))
      )
        throw new Error('Renseignez le client, la date, le type et le statut.');
      const data: Row = {
        customer_id: effective.customer_id,
        status_id: effective.status_id,
        type_id: effective.type_id,
        invoice_date: form.invoice_date,
        notes: form.notes,
      };
      if (addTo) {
        if (!Object.keys(selected).length) throw new Error('Sélectionnez au moins une vente.');
        return adminApi.write('post', `/invoices/${addTo}/add-sales`, {
          sale_ids: Object.keys(selected).map(Number),
        });
      }
      if (mode === 'manual') {
        if (settings.isError || !settings.data)
          throw new Error('Chargez les paramètres de facturation avant d’enregistrer.');
        if (!lines.length) throw new Error('Ajoutez au moins une ligne.');
        invoicePreview(lines, settingsRow, String(form.discount_type), form.discount_value);
        data.items = lines.map(invoiceLine);
        data.discount_type = form.discount_type;
        data.discount_value = Number(String(form.discount_value).replace(',', '.'));
      } else if (!editing) {
        if (!Object.keys(selected).length) throw new Error('Sélectionnez au moins une vente.');
        data.sale_ids = Object.keys(selected).map(Number);
      }
      return adminApi.write(
        editing ? 'put' : 'post',
        editing
          ? `/invoices/${itemId(row!)}`
          : mode === 'sales'
            ? '/invoices/from-sales'
            : '/invoices/manual',
        data,
      );
    },
    (value) => onSaved(addTo ?? (row?.id ? itemId(row) : itemId(record(value)))),
  );
  let totals: ReturnType<typeof invoicePreview> | undefined;
  let previewError = '';
  if (mode === 'manual' && lines.length) {
    try {
      totals = invoicePreview(lines, settingsRow, String(form.discount_type), form.discount_value);
    } catch (e) {
      previewError = (e as Error).message;
    }
  }
  const next = () => {
    setError('');
    if (
      step === 1 &&
      (!effective.customer_id || !effective.status_id || !effective.type_id || !form.invoice_date)
    ) {
      setError('Renseignez le client, le type, le statut et la date.');
      return;
    }
    if (
      step === 2 &&
      !editing &&
      (mode === 'manual' ? !lines.length : !Object.keys(selected).length)
    ) {
      setError('Ajoutez au moins un article ou sélectionnez une vente.');
      return;
    }
    setStep(step + 1);
  };
  return (
    <AdminPage
      scroll={!(step === 2 && mode === 'sales' && (!editing || !!addTo))}
      title={
        addTo
          ? 'Ajouter des ventes'
          : editing
            ? 'Modifier la facture'
            : mode === 'sales'
              ? 'Facture à partir des ventes'
              : 'Facture manuelle'
      }
      onBack={leave.back}
      footer={
        can(permission) ? (
          <View style={design.row}>
            <Button
              label="Précédent"
              fullWidth={false}
              style={design.grow}
              variant="outline"
              disabled={step === 1 || !!addTo || action.isPending}
              onPress={() => setStep(step - 1)}
            />
            <Button
              label={step === 3 || addTo ? 'Enregistrer' : 'Suivant'}
              fullWidth={false}
              style={design.grow}
              loading={action.isPending}
              onPress={() => (step === 3 || addTo ? action.mutate({}) : next())}
            />
          </View>
        ) : undefined
      }
    >
      <AppText variant="labelLg">
        {step}. {['Informations', 'Articles', 'Récapitulatif'][step - 1]}
      </AppText>
      {step === 1 ? (
        <>
          <Panel title="Informations">
            <ReferenceSelect
              label="Client *"
              path="/customerDropdown"
              value={String(form.customer_id)}
              onChange={(v) => update('customer_id', v)}
            />
            <ReferenceSelect
              label="Type *"
              path="/types/invoice"
              value={String(form.type_id)}
              onChange={(v) => update('type_id', v)}
            />
            <ReferenceSelect
              label="Statut *"
              path="/statuses"
              params={{ src: 'invoice' }}
              value={String(effective.status_id)}
              onChange={(v) => update('status_id', v)}
            />
            <DateInput
              label="Date de facture *"
              value={String(form.invoice_date)}
              onChange={(v) => update('invoice_date', v)}
            />
          </Panel>
          <Fold label="Note (facultatif)">
            <TextField
              label="Note"
              multiline
              value={String(form.notes)}
              onChangeText={(v) => update('notes', v)}
            />
          </Fold>
        </>
      ) : step === 2 ? (
        mode === 'sales' ? (
          <>
            <Notice>
              {editing
                ? 'Les lignes restent liées aux ventes d’origine. Modifiez les informations de la facture à l’étape précédente.'
                : 'Sélectionnez les ventes à inclure dans la facture.'}
            </Notice>
            {!editing || addTo ? (
              <>
                <TextField
                  label="Rechercher une vente"
                  placeholder="Référence…"
                  value={search}
                  onChangeText={setSearch}
                />
                <CommerceList
                  header={null}
                  query={available}
                  renderItem={({ item }) => (
                    <Panel>
                      <Toggle
                        label={`${item.ref} • ${currency(item.totalWithTax ?? item.total)}`}
                        value={!!selected[itemId(item)]}
                        onChange={(checked) => {
                          setDirty(true);
                          setSelected((current) => {
                            const next = { ...current };
                            if (checked) next[itemId(item)] = item;
                            else delete next[itemId(item)];
                            return next;
                          });
                        }}
                      />
                    </Panel>
                  )}
                />
                <Panel>
                  <AppText>{Object.keys(selected).length} ventes sélectionnées</AppText>
                  <Pair
                    label="Total sélectionné"
                    value={currency(
                      Object.values(selected).reduce(
                        (sum, s) => sum + Number(s.totalWithTax ?? s.total ?? 0),
                        0,
                      ),
                    )}
                  />
                </Panel>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Button
              label="Ajouter une ligne"
              icon="add"
              onPress={() => {
                setLineIndex(-1);
                setLine({
                  label: '',
                  quantity: '1',
                  unit_price: '0',
                  tax_rate: '0',
                  discount_type: 'percent',
                  discount_value: '0',
                });
              }}
            />
            {lines.map((item, i) => (
              <Panel key={i} title={String(item.label)}>
                <Pair
                  label={`${item.quantity} × ${currency(item.unit_price)}`}
                  value={String(item.tax_rate) + ' % TVA'}
                />
                <View style={design.row}>
                  <Button
                    label="Modifier"
                    variant="tonal"
                    compact
                    fullWidth={false}
                    onPress={() => {
                      setLineIndex(i);
                      setLine({ ...item });
                    }}
                  />
                  <Button
                    label="Retirer"
                    variant="ghost"
                    compact
                    fullWidth={false}
                    onPress={() => {
                      setDirty(true);
                      setLines(lines.filter((_, j) => i !== j));
                    }}
                  />
                </View>
              </Panel>
            ))}
          </>
        )
      ) : (
        <>
          <Panel title="Récapitulatif">
            <Pair label="Date" value={String(form.invoice_date)} />
            {mode === 'manual' && totals ? (
              <>
                <Pair label="Sous-total HT" value={currency(totals.subtotal)} />
                <Pair label="Remises par ligne" value={currency(totals.lineDiscount)} />
                <Pair label="Remise globale" value={currency(totals.discount)} />
                <Pair label="Base taxable" value={currency(totals.base)} />
                <Pair label="TVA" value={currency(totals.tax)} />
                <Pair label="Total TTC" value={currency(totals.total)} />
                <AppText variant="bodySm">
                  Aperçu selon les règles de facturation ; les montants définitifs sont calculés par
                  le serveur.
                </AppText>
              </>
            ) : (
              <AppText>
                {editing
                  ? 'Les ventes liées sont conservées.'
                  : `${Object.keys(selected).length} ventes sélectionnées`}
              </AppText>
            )}
          </Panel>
          {mode === 'sales' && !editing ? (
            <Panel title="Ventes sélectionnées">
              {Object.values(selected).map((sale) => (
                <View key={itemId(sale)} style={{ gap: 4 }}>
                  <Pair
                    label={String(sale.ref ?? `Vente #${itemId(sale)}`)}
                    value={currency(sale.totalWithTax ?? sale.total ?? 0)}
                  />
                  <AppText variant="bodySm">{date(sale.date)}</AppText>
                </View>
              ))}
              <Pair
                label="Total sélectionné"
                value={currency(
                  Object.values(selected).reduce(
                    (sum, sale) => sum + Number(sale.totalWithTax ?? sale.total ?? 0),
                    0,
                  ),
                )}
              />
            </Panel>
          ) : null}
          {mode === 'manual' && settingsRow.allow_invoice_discount ? (
            <Panel title="Remise globale">
              <Tabs
                values={['percent', 'fixed']}
                value={String(form.discount_type)}
                onChange={(v) => update('discount_type', v)}
              />
              <TextField
                label={form.discount_type === 'fixed' ? 'Montant de remise (DH)' : 'Remise (%)'}
                value={String(form.discount_value)}
                keyboardType="decimal-pad"
                onChangeText={(v) => update('discount_value', v)}
              />
            </Panel>
          ) : null}
          {form.notes ? (
            <Panel title="Note">
              <AppText>{String(form.notes)}</AppText>
            </Panel>
          ) : null}
        </>
      )}
      {previewError || error || action.isError ? (
        <Notice>{previewError || error || action.error?.message}</Notice>
      ) : null}
      {settings.isError && mode === 'manual' ? <Notice>{settings.error.message}</Notice> : null}
      {statuses.isError ? <Notice>{statuses.error.message}</Notice> : null}
      {leave.dialog}
      <SelectionDialog
        visible={!!line}
        title={lineIndex < 0 ? 'Ajouter une ligne' : 'Modifier une ligne'}
        onClose={() => setLine(undefined)}
      >
        {line ? (
          <>
            {[
              ['label', 'Désignation *'],
              ['quantity', 'Quantité *'],
              ['unit_price', 'Prix unitaire (DH) *'],
              ['tax_rate', 'TVA (%) *'],
            ].map(([key, label]) => (
              <TextField
                key={key}
                label={label!}
                value={String(line[key!] ?? '')}
                keyboardType={key === 'label' ? 'default' : 'decimal-pad'}
                onChangeText={(v) => setLine({ ...line, [key!]: v })}
              />
            ))}
            {settingsRow.allow_line_discount ? (
              <>
                <Tabs
                  values={['percent', 'fixed']}
                  value={String(line.discount_type)}
                  onChange={(v) => setLine({ ...line, discount_type: v })}
                />
                <TextField
                  label="Remise"
                  value={String(line.discount_value)}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => setLine({ ...line, discount_value: v })}
                />
              </>
            ) : null}
            {error ? <Notice>{error}</Notice> : null}
            <Button
              label="Ajouter au document"
              onPress={() => {
                try {
                  const value = invoiceLine(line);
                  setLines(
                    lineIndex < 0
                      ? [...lines, value]
                      : lines.map((v, i) => (i === lineIndex ? value : v)),
                  );
                  setDirty(true);
                  setLine(undefined);
                  setError('');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </>
        ) : null}
      </SelectionDialog>
    </AdminPage>
  );
}
