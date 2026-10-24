import { saleTotals, type CartLine } from '@/features/sales/salesApi';
import type { Row } from './api';
import { itemId } from '@/features/crm/crmApi';
export function defaultOrderStatus(rows: Row[]): string {
  const row = rows.find(
    (row) =>
      String(row.code ?? '')
        .trim()
        .toLowerCase() === 'created',
  );
  return row ? itemId(row) : '';
}
export interface OrderFormData {
  ref: string;
  date: string;
  customer: string;
  status: string;
  discount: string;
  tax: string;
  paid: string;
  note: string;
}
export function orderPayload(form: OrderFormData, lines: CartLine[], id?: string): Row {
  if (
    !form.ref.trim() ||
    !form.customer ||
    !form.status ||
    !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
    !Number.isFinite(Date.parse(form.date))
  )
    throw new Error('Renseignez la référence, une date valide, le client et le statut.');
  if (!lines.length) throw new Error('Ajoutez au moins un produit.');
  const [discount, tax, paid] = [form.discount, form.tax, form.paid].map((value) =>
    Number(value.replace(',', '.')),
  );
  if (
    ![discount, tax, paid].every(Number.isFinite) ||
    discount! < 0 ||
    discount! > 100 ||
    tax! < 0 ||
    tax! > 100 ||
    paid! < 0
  )
    throw new Error('Montants ou taux invalides.');
  for (const line of lines) {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity <= 0 ||
      line.product.quantity == null ||
      line.quantity > line.product.quantity ||
      !Number.isFinite(line.product.sellingPrice) ||
      line.product.sellingPrice < 0 ||
      !Number.isFinite(line.discount ?? 0) ||
      (line.discount ?? 0) < 0 ||
      (line.discount ?? 0) > 100
    )
      throw new Error(`Quantité, prix ou remise invalide : ${line.product.productName}`);
  }
  const totals = saleTotals(lines, discount!, tax!, paid!);
  if (paid! > totals.total) throw new Error('L’acompte dépasse le total.');
  return {
    ...(id ? { id } : {}),
    ref: form.ref.trim(),
    date: form.date,
    customer_id: Number(form.customer),
    status: Number(form.status),
    discount,
    calDiscount: totals.discountAmount,
    tax,
    paid,
    due: totals.due,
    subTotal: totals.subtotal,
    total: totals.total,
    totalWithTax: totals.total,
    active: 1,
    note: form.note || '.',
    dataItems: JSON.stringify(
      lines.map((line) => {
        const gross = line.quantity * line.product.sellingPrice,
          reduction = Math.round(gross * (line.discount ?? 0)) / 100;
        return {
          product_id: line.product.id,
          title: line.product.productName,
          ref: line.product.sku,
          qte: line.quantity,
          price: line.product.sellingPrice,
          discount: line.discount ?? 0,
          callDiscount: reduction,
          total: Math.round((gross - reduction) * 100) / 100,
          Total: Math.round((gross - reduction) * 100) / 100,
          dateExperation: null,
          QteAvailable: line.product.quantity,
        };
      }),
    ),
  };
}
export function orderLines(rows: Row[]): CartLine[] {
  return rows.map((row) => ({
    product: {
      id: Number(row.product_id),
      productName: String(row.title ?? 'Produit'),
      sku: String(row.ref ?? row.sku ?? ''),
      categoryId: 0,
      minQuantity: 0,
      quantity: Number(row.qte),
      buyingPrice: null,
      sellingPrice: Number(row.price ?? row.Price ?? 0),
      active: 1,
      hasExpiration: row.expiredDate ? 1 : 0,
      expiry: row.expiredDate ? String(row.expiredDate).slice(0, 10) : null,
    },
    quantity: Number(row.qte),
    discount: Number(row.discount ?? 0),
  }));
}
