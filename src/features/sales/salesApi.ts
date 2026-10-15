import type { Product } from '@/features/stores/productsApi';
import { apiGet, apiPost } from '@/services/api/client';
import { itemId, listPayload, record, type CrmRecord } from '@/features/crm/crmApi';
export interface CartLine {
  product: Product;
  quantity: number;
}
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function saleTotals(lines: CartLine[], discount: number, tax: number, received: number) {
  const subtotal = round(lines.reduce((sum, l) => sum + l.quantity * l.product.sellingPrice, 0));
  const discountAmount = round((subtotal * discount) / 100);
  const taxAmount = round(((subtotal - discountAmount) * tax) / 100);
  const total = round(subtotal - discountAmount + taxAmount);
  const paid = Math.min(received, total);
  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    paid,
    due: round(Math.max(0, total - paid)),
    change: round(Math.max(0, received - total)),
  };
}
export function salePayload(input: {
  lines: CartLine[];
  customer: string;
  status: string;
  paymentType: string;
  paymentStatus: string;
  discount: number;
  tax: number;
  received: number;
  note: string;
  reference: string;
}) {
  if (!input.customer || !input.status || !input.paymentType || !input.paymentStatus)
    throw new Error('Sélectionnez le client, le statut et le mode de paiement.');
  if (!input.lines.length) throw new Error('Ajoutez au moins un produit.');
  if (
    ![input.discount, input.tax, input.received].every(Number.isFinite) ||
    input.discount < 0 ||
    input.discount > 100 ||
    input.tax < 0 ||
    input.tax > 100 ||
    input.received < 0
  )
    throw new Error('Les montants saisis sont invalides.');
  for (const line of input.lines) {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.product.quantity === null ||
      line.quantity > line.product.quantity ||
      line.product.sellingPrice < 0
    )
      throw new Error('Quantité indisponible pour ' + line.product.productName);
  }
  const totals = saleTotals(input.lines, input.discount, input.tax, input.received);
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    ref: input.reference,
    date,
    customer_id: Number(input.customer),
    status: Number(input.status),
    paymentType: Number(input.paymentType),
    paymentStatus: Number(input.paymentStatus),
    receivedAmount: input.received,
    paid: totals.paid,
    due: totals.due,
    total: totals.total,
    totalWithTax: totals.total,
    subTotal: totals.subtotal,
    discount: input.discount,
    calDiscount: totals.discountAmount,
    tax: input.tax,
    note: input.note || '.',
    paymentNote: '.',
    active: 1,
    dataItems: JSON.stringify(
      input.lines.map(({ product: p, quantity: q }) => ({
        product_id: p.id,
        title: p.productName,
        ref: p.sku,
        price: p.sellingPrice,
        qte: q,
        Total: (p.sellingPrice * q).toFixed(2),
        dateExperation: null,
        QteAvailable: p.quantity,
        discount: 0,
        callDiscount: 0,
      })),
    ),
  };
}
export const salesApi = {
  list: async (
    page: number,
    search: string,
    dates: { from_date?: string; to_date?: string } = {},
    signal?: AbortSignal,
  ) =>
    listPayload(
      await apiGet('/listeSales', {
        signal,
        params: {
          ...dates,
          page,
          per_page: 20,
          searchValue: search || undefined,
          sortField: 'id',
          sortOrder: 'desc',
        },
      }),
    ),
  detail: async (id: string, signal?: AbortSignal) => {
    const [body, items] = await Promise.all([
      apiGet<unknown>(`/sales/show/${encodeURIComponent(id)}`, { signal }),
      apiGet<unknown>(`/items/show/${encodeURIComponent(id)}`, { signal }),
    ]);
    const raw = record(body);
    return {
      sale: record(Array.isArray(raw.sale) ? raw.sale[0] : raw.sale),
      company: record(raw.company),
      items: listPayload(items).rows,
    };
  },
  create: async (payload: CrmRecord, key: string) => {
    const result = record(
      await apiPost('/sales', payload, { headers: { 'Idempotency-Key': key } }),
    );
    if (!itemId(result)) throw new Error('La vente n’a pas été confirmée par le serveur.');
    return itemId(result);
  },
};
