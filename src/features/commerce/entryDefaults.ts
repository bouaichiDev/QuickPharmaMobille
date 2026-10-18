import { itemId, type CrmRecord } from '@/features/crm/crmApi';
const normalized = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();
export function defaultEntryProvider(rows: CrmRecord[]) {
  const row = rows.find((r) =>
    [r.code, r.Code, r.name, r.Name].some((value) => normalized(value) === 'default provider'),
  );
  return row ? String(row.id ?? row.Id ?? itemId(row)) : '';
}
export function defaultEntryStatus(rows: CrmRecord[]) {
  const row = rows.find((r) =>
    [r.code, r.title, r.name, r.label].some((value) => normalized(value) === 'complete'),
  );
  return row ? itemId(row) : '';
}
export function defaultEntryPayment(rows: CrmRecord[], kind: 'cash' | 'paid') {
  const aliases = kind === 'cash' ? ['cash', 'espèces', 'especes'] : ['paid', 'payée', 'payé'];
  const row = rows.find((r) =>
    [r.code, r.title, r.name, r.label].some((value) => aliases.includes(normalized(value))),
  );
  return row ? itemId(row) : '';
}
export function translatedReference(
  row: CrmRecord,
  translate: (key: string, fallback: string) => string,
) {
  const label = String(row.label ?? row.title ?? row.name ?? row.code ?? '');
  const labels: Record<string, string> = {
    complete: 'Terminée',
    completed: 'Terminée',
    pending: 'En attente',
    draft: 'Brouillon',
    cancelled: 'Annulée',
    canceled: 'Annulée',
    paid: 'Payée',
    unpaid: 'Impayée',
    partial: 'Partiellement payée',
    cash: 'Espèces',
    transfer: 'Virement',
    banktransfer: 'Virement',
    creditcard: 'Carte bancaire',
    cheque: 'Chèque',
  };
  const fallback = labels[normalized(label)] ?? label;
  return translate(label, translate(String(row.code ?? label), fallback));
}
