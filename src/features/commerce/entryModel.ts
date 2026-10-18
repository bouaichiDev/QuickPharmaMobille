import { number, type Row } from './api';
export interface EntryLine {
  key: string;
  product_id: number;
  title: string;
  ref: string;
  qte: number;
  price: number;
  dateExperation: string | null;
  hasExpiration?: boolean;
}
export interface EntryFormData {
  ref: string;
  date: string;
  provider_id: string;
  status: string;
  paymentType: string;
  paymentStatus: string;
  discount: string;
  tax: string;
  paid: string;
  note: string;
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function entryTotals(lines: EntryLine[], discount: number, tax: number, paid: number) {
  const subtotal = round(lines.reduce((sum, line) => sum + line.price * line.qte, 0));
  const taxAmount = round((Math.max(0, subtotal - discount) * tax) / 100),
    total = round(subtotal - discount + taxAmount);
  return {
    subtotal,
    taxAmount,
    total,
    discount: round(discount),
    paid: round(paid),
    due: round(Math.max(0, total - paid)),
    quantity: lines.reduce((sum, line) => sum + line.qte, 0),
  };
}
export function entryPayload(form: EntryFormData, lines: EntryLine[], id?: string): Row {
  if (
    !form.ref.trim() ||
    !form.date ||
    !form.provider_id ||
    !form.status ||
    !form.paymentType ||
    !form.paymentStatus
  )
    throw new Error(
      'Complétez la référence, la date, le fournisseur, les statuts et le mode de paiement.',
    );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !Number.isFinite(Date.parse(form.date)))
    throw new Error('Date de réception invalide.');
  if (!lines.length) throw new Error('Ajoutez au moins un produit.');
  if (
    lines.some(
      (l) =>
        !Number.isInteger(l.qte) ||
        l.qte <= 0 ||
        !Number.isFinite(l.price) ||
        l.price < 0 ||
        !l.product_id,
    )
  )
    throw new Error('Les quantités doivent être des entiers positifs et les prix valides.');
  if (lines.some((l) => l.hasExpiration && !l.dateExperation))
    throw new Error('Renseignez la date d’expiration des produits concernés.');
  const values = [form.discount, form.tax, form.paid].map((v) => Number(v.replace(',', '.')));
  if (values.some((v) => !Number.isFinite(v) || v < 0) || (values[1] ?? 0) > 100)
    throw new Error('Montants ou taux de taxe invalides.');
  const [discount, tax, paid] = values as [number, number, number];
  const totals = entryTotals(lines, discount, tax, paid);
  if (discount > totals.subtotal) throw new Error('La remise dépasse le sous-total.');
  if (paid > totals.total) throw new Error('Le montant payé dépasse le total.');
  return {
    ...(id ? { id } : {}),
    ref: form.ref,
    date: form.date,
    provider_id: Number(form.provider_id),
    status: Number(form.status),
    paymentType: Number(form.paymentType),
    paymentStatus: Number(form.paymentStatus),
    discount,
    calDiscount: discount,
    tax,
    paid,
    due: totals.due,
    total: totals.total,
    totalWithTax: totals.total,
    subTotal: totals.subtotal,
    receivedAmount: paid,
    note: form.note || '.',
    paymentNote: '.',
    active: 1,
    dataItems: JSON.stringify(
      lines.map((l) => ({
        ...(id && !l.key.startsWith('new-') ? { id: l.key } : {}),
        product_id: l.product_id,
        title: l.title,
        ref: l.ref,
        qte: l.qte,
        price: l.price,
        Total: round(l.price * l.qte),
        dateExperation: l.dateExperation,
      })),
    ),
  };
}
export function linesFrom(rows: Row[]): EntryLine[] {
  return rows.map((r, i) => ({
    key: String(r.id ?? `new-${i}`),
    product_id: number(r.product_id),
    title: String(r.title ?? r.productName ?? 'Produit'),
    ref: String(r.ref ?? r.sku ?? ''),
    qte: number(r.qte),
    price: number(r.price),
    dateExperation: r.dateExperation ? String(r.dateExperation).slice(0, 10) : null,
    hasExpiration: r.hasExpiration == null ? undefined : Number(r.hasExpiration) === 1,
  }));
}
export interface FastLine {
  product_name: string;
  quantity: number;
  buying_price: number;
  provider_name: string;
  status: 'paid' | 'unpaid';
  paid_amount: number;
  brand_name?: string;
}
export function fastPayload(date: string, rows: FastLine[]) {
  if (!date || !rows.length) throw new Error('Ajoutez au moins une ligne et une date.');
  if (
    rows.some(
      (r) =>
        !r.product_name.trim() ||
        !r.provider_name.trim() ||
        !Number.isInteger(r.quantity) ||
        r.quantity <= 0 ||
        !Number.isFinite(r.buying_price) ||
        r.buying_price < 0 ||
        !Number.isFinite(r.paid_amount) ||
        r.paid_amount < 0 ||
        r.paid_amount > round(r.quantity * r.buying_price),
    )
  )
    throw new Error('Complétez chaque ligne avec une quantité, un prix et un paiement valides.');
  return {
    date,
    rows: rows.map((r) => ({
      ...r,
      status: r.paid_amount >= round(r.quantity * r.buying_price) ? 'paid' : 'unpaid',
    })),
  };
}
