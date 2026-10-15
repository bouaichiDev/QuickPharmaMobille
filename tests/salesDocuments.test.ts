import { receiptBarcode, generateCode128 } from '../src/features/sales/receiptBarcode';
import { receiptHtml, receiptSummary, receiptCustomer } from '../src/features/sales/SaleDocuments';
jest.mock('../src/features/sales/SalesDesign', () => ({
  money: (value: unknown) => Number(value ?? 0).toFixed(2),
}));
const data = {
  company: {
    companyName: 'Pharmacie test',
    companyAddress: 'Adresse test',
    companyTell: '01020304',
  },
  sale: {
    ref: 'SL-1234',
    date: '2026-10-10',
    subTotal: 200,
    calDiscount: 20,
    totalWithTax: 216,
    paid: 100,
    due: 116,
    typePayment: 'cash',
  },
  items: [{ title: 'Produit <test>', qte: 2, price: 100 }],
};
describe('web-compatible sales documents', () => {
  it('uses discounted tax and distinguishes debt from change', () => {
    expect(receiptSummary(data)).toMatchObject({
      tax: 36,
      discount: 20,
      due: 116,
      change: 0,
      paid: 100,
    });
    expect(
      receiptSummary({ ...data, sale: { ...data.sale, paid: 216, due: 0, receivedAmount: 250 } }),
    ).toMatchObject({ change: 34, due: 0 });
  });
  it('handles backend company aliases and object customers', () => {
    expect(receiptSummary(data)).toMatchObject({ address: 'Adresse test', phone: '01020304' });
    expect(receiptCustomer({ customer: { FirstName: 'Sofia', LastName: 'Amrani' } })).toBe(
      'Sofia Amrani',
    );
  });
  it('escapes product/customer text and emits all articles, not the preview limit', () => {
    const html = receiptHtml({
      ...data,
      sale: { ...data.sale, customer: '<script>test</script>' },
      items: Array.from({ length: 65 }, (_, i) => ({ ...data.items[0], title: `Produit <${i}>` })),
    });
    expect(html).toContain('Produit &lt;64&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('80mm');
    expect(html).toContain('Reste dû');
  });
  it('encodes Code128 checksums including reserved symbols with quiet zones', () => {
    for (let i = 0; i < 250; i++) {
      const value = String(i);
      const bars = generateCode128(value);
      expect(bars.reduce((sum, bar) => sum + bar.width, 0)).toBe(20 + 11 * (value.length + 2) + 13);
      expect(bars[0]).toEqual({ width: 10, isBlack: false });
    }
    expect(receiptBarcode('SL-1234')).toEqual(generateCode128('1234'));
    expect(receiptBarcode('SL-中文')).toEqual([]);
  });
});
