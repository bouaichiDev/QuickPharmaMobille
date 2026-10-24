import type { Row } from './api';
const numeric = (value: unknown) => {
  const n = Number(String(value ?? 0).replace(',', '.'));
  if (!Number.isFinite(n)) throw new Error('Montant invalide.');
  return n;
};
export function invoiceLine(row: Row): Row {
  const label = String(row.label ?? '').trim(),
    quantity = numeric(row.quantity),
    unit_price = numeric(row.unit_price),
    tax_rate = numeric(row.tax_rate),
    discount_value = numeric(row.discount_value);
  if (
    !label ||
    quantity < 0.001 ||
    unit_price < 0 ||
    tax_rate < 0 ||
    tax_rate > 100 ||
    discount_value < 0 ||
    (row.discount_type === 'percent' && discount_value > 100)
  )
    throw new Error('Vérifiez la désignation, la quantité, le prix, la taxe et la remise.');
  return {
    label,
    quantity,
    unit_price,
    tax_rate,
    discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percent',
    discount_value,
  };
}
export function invoicePreview(
  lines: Row[],
  settings: Row,
  discountType: string,
  discountValue: unknown,
) {
  const precision = Number(settings.rounding_precision ?? 2),
    factor = 10 ** Math.max(0, Math.min(6, precision));
  const round = (n: number) =>
    settings.rounding_mode === 'none'
      ? n
      : (settings.rounding_mode === 'floor'
          ? Math.floor(n * factor)
          : settings.rounding_mode === 'ceil'
            ? Math.ceil(n * factor)
            : Math.round((n + Number.EPSILON) * factor)) / factor;
  let subtotal = 0,
    lineDiscount = 0,
    tax = 0;
  for (const raw of lines) {
    const line = invoiceLine(raw),
      gross = Number(line.quantity) * Number(line.unit_price);
    const d = settings.allow_line_discount
      ? line.discount_type === 'fixed'
        ? Math.min(Number(line.discount_value), gross)
        : (gross *
            Math.min(
              Number(line.discount_value),
              Number(settings.max_line_discount_percent ?? 100),
            )) /
          100
      : 0;
    subtotal += round(gross);
    lineDiscount += round(d);
    tax += (round(gross - d) * Number(line.tax_rate)) / 100;
  }
  const value = numeric(discountValue);
  if (value < 0 || (discountType === 'percent' && value > 100))
    throw new Error('Remise globale invalide.');
  const discount = settings.allow_invoice_discount
    ? discountType === 'fixed'
      ? Math.min(value, subtotal)
      : (subtotal * Math.min(value, Number(settings.max_invoice_discount_percent ?? 100))) / 100
    : 0;
  const base = Math.max(0, subtotal - lineDiscount - discount);
  return {
    subtotal: round(subtotal),
    lineDiscount: round(lineDiscount),
    discount: round(discount),
    base: round(base),
    tax: round(tax),
    total: round(base + tax),
  };
}
