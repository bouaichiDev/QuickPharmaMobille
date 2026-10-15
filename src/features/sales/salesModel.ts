import type { CrmRecord } from '@/features/crm/crmApi';
export type PaymentFilter = 'all' | 'paid' | 'partial' | 'unpaid';
export function paymentState(sale: CrmRecord): Exclude<PaymentFilter, 'all'> {
  const due = Number(
    sale.due ?? Math.max(0, Number(sale.totalWithTax ?? sale.total ?? 0) - Number(sale.paid ?? 0)),
  );
  return due <= 0 ? 'paid' : Number(sale.paid ?? 0) > 0 ? 'partial' : 'unpaid';
}
export const paymentLabels = { paid: 'Réglée', partial: 'Partielle', unpaid: 'Impayée' };
export function referenceText(row: CrmRecord) {
  const translations: Record<string, string> = {
    cash: 'Espèces',
    cardcredit: 'Carte TPE',
    creditcard: 'Carte TPE',
    card: 'Carte TPE',
    transfer: 'Virement',
    banktransfer: 'Virement',
    cheque: 'Chèque',
    check: 'Chèque',
    complete: 'Terminée',
    completed: 'Terminée',
    pending: 'En attente',
    draft: 'Brouillon',
  };
  const code = String(row.code ?? row.label ?? row.name ?? '')
    .toLowerCase()
    .replace(/[_ -]/g, '');
  return translations[code] ?? String(row.label ?? row.name ?? row.code ?? '');
}
export type SalePeriod = 'all' | 'month' | 'week' | 'today';
export function salePeriodDates(period: SalePeriod, now = new Date()) {
  if (period === 'all') return {};
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'month') start.setDate(1);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from_date: fmt(start), to_date: fmt(now) };
}
export function saleDate(value: unknown) {
  const raw = String(value ?? '');
  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime())
    ? raw
    : parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
