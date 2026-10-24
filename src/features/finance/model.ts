import { record, unwrap, type CrmRecord as Row } from '@/features/crm/crmApi';
export const statusLabels: Record<string, string> = {
  pending: 'En attente',
  postdated: 'Postdaté',
  deposited: 'Déposé',
  processing: 'En traitement',
  cleared: 'Encaissé',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};
export const alertLabels: Record<string, string> = {
  stock_low: 'Stock faible',
  stock_out: 'Rupture de stock',
  product_expiring: 'Péremption proche',
  product_expired: 'Produit expiré',
  credit_limit: 'Limite de crédit',
  credit_overdue: 'Crédit en retard',
  cheque_due: 'Échéance de chèque',
  cheque_rejected: 'Chèque rejeté',
  sales_drop: 'Baisse des ventes',
  system: 'Système',
};
export const priorities: Record<string, string> = {
  critical: 'Critique',
  high: 'Élevée',
  medium: 'Moyenne',
  low: 'Faible',
};
export function financePage(body: unknown) {
  const value = unwrap(body),
    raw = record(value);
  const rows = Array.isArray(value) ? value : (raw.data ?? raw.customers);
  if (!Array.isArray(rows)) throw new Error('Réponse de liste invalide.');
  const meta = record(raw.pagination ?? raw);
  return {
    rows: rows.map((value) => {
      const row = record(value);
      return row.customer_id && !row.uid && !row.id ? { ...row, id: row.customer_id } : row;
    }),
    total: Number(meta.total ?? raw.total_customers_with_credit ?? rows.length),
    lastPage: Number(meta.last_page ?? 1),
    summary: raw,
  };
}
export function chequeActions(row: Row) {
  const status = String(record(row.status).code);
  return {
    deposit: ['pending', 'postdated'].includes(status),
    clear: ['deposited', 'processing'].includes(status),
    reject: ['deposited', 'processing'].includes(status),
    cancel: ['pending', 'postdated'].includes(status),
    edit: ['pending', 'postdated'].includes(status),
    delete: ['pending', 'postdated'].includes(status),
  };
}
export function chequePayload(form: Row): Row {
  const amount = Number(String(form.amount ?? '').replace(',', '.'));
  if (!form.type_id || !Number.isFinite(amount) || amount <= 0)
    throw new Error('Choisissez le type et un montant positif.');
  if (!form.cheque_number || !form.bank_name || !form.account_holder)
    throw new Error('Renseignez le numéro, la banque et le titulaire.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(form.issue_date)) ||
    (form.due_date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.due_date)) ||
        String(form.due_date) < String(form.issue_date)))
  )
    throw new Error('Les dates du chèque sont invalides.');
  return {
    type_id: Number(form.type_id),
    amount,
    cheque_number: String(form.cheque_number).trim(),
    bank_name: String(form.bank_name).trim(),
    account_holder: String(form.account_holder).trim(),
    issue_date: form.issue_date,
    due_date: form.due_date || null,
    customer_id: form.customer_id ? Number(form.customer_id) : null,
    provider_id: form.provider_id ? Number(form.provider_id) : null,
    ...(form.payment_id ? { payment_id: Number(form.payment_id) } : {}),
    ...(form.source_sale_id ? { source_sale_id: Number(form.source_sale_id) } : {}),
    ...(form.source_entree_id ? { source_entree_id: Number(form.source_entree_id) } : {}),
    notes: form.notes ?? '',
  };
}
