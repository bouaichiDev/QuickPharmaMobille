import { paymentState, salePeriodDates, referenceText } from '../src/features/sales/salesModel';
import { salePayload, saleTotals, type CartLine } from '../src/features/sales/salesApi';
const lines: CartLine[] = [
  {
    product: {
      id: 1,
      productName: 'Produit test',
      sku: 'TEST',
      sellingPrice: 100,
      quantity: 5,
      categoryId: 1,
      minQuantity: 0,
      buyingPrice: 50,
      active: 1,
      hasExpiration: 0,
    },
    quantity: 2,
  },
];
const base = {
  lines,
  customer: '1',
  status: '2',
  paymentType: '7',
  paymentStatus: '10',
  discount: 10,
  tax: 20,
  received: 100,
  note: '',
  reference: 'SL-MOB-',
};
describe('mobile checkout', () => {
  it('applies tax after discount and computes partial payment', () => {
    expect(saleTotals(lines, 10, 20, 100)).toEqual({
      subtotal: 200,
      discountAmount: 20,
      taxAmount: 36,
      total: 216,
      paid: 100,
      due: 116,
      change: 0,
    });
  });
  it('caps paid amount and separates change from debt', () => {
    expect(saleTotals(lines, 0, 0, 250)).toMatchObject({ paid: 200, due: 0, change: 50 });
  });
  it('serializes stock lines in the web API format', () => {
    const p = salePayload(base);
    expect(JSON.parse(p.dataItems)[0]).toMatchObject({
      product_id: 1,
      qte: 2,
      Total: '200.00',
      QteAvailable: 5,
      dateExperation: null,
    });
    expect(p).toMatchObject({ paid: 100, due: 116, total: 216, customer_id: 1 });
  });
  it.each([NaN, -1, 101])('rejects invalid discounts %s', (discount) => {
    expect(() => salePayload({ ...base, discount })).toThrow();
  });
  it('rejects excessive or fractional stock quantities', () => {
    expect(() => salePayload({ ...base, lines: [{ ...lines[0]!, quantity: 6 }] })).toThrow();
    expect(() => salePayload({ ...base, lines: [{ ...lines[0]!, quantity: 1.5 }] })).toThrow();
  });
  it('rejects unknown stock and missing customer', () => {
    expect(() =>
      salePayload({
        ...base,
        lines: [{ ...lines[0]!, product: { ...lines[0]!.product, quantity: null } }],
      }),
    ).toThrow();
    expect(() => salePayload({ ...base, customer: '' })).toThrow();
  });
});

describe('sale list filters', () => {
  it('classifies settled, partially paid and unpaid sales using actual amounts', () => {
    expect(paymentState({ paid: 50, due: 0 })).toBe('paid');
    expect(paymentState({ paid: 50, totalWithTax: 100 })).toBe('partial');
    expect(paymentState({ paid: 0, due: 100 })).toBe('unpaid');
  });
  it('uses local calendar dates and Monday for the week filter', () => {
    const now = new Date(2026, 9, 10, 8);
    expect(salePeriodDates('all', now)).toEqual({});
    expect(salePeriodDates('week', now)).toEqual({
      from_date: '2026-10-05',
      to_date: '2026-10-10',
    });
    expect(salePeriodDates('month', now)).toEqual({
      from_date: '2026-10-01',
      to_date: '2026-10-10',
    });
  });
});

it('translates a payment type returned as a label without a code', () => {
  expect(referenceText({ id: 7, label: 'cardcredit' })).toBe('Carte TPE');
});
