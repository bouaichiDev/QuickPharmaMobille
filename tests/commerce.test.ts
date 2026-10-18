import {
  entryPayload,
  entryTotals,
  fastPayload,
  linesFrom,
  type EntryFormData,
  type EntryLine,
} from '@/features/commerce/entryModel';
import { pageFrom, payload } from '@/features/commerce/api';
import { entryDocumentHtml } from '@/features/commerce/entryDocuments';
import { backendMenuGroups } from '@/features/navigation/backendMenu';
import { makeAccess } from './fixtures/access';
jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  httpClient: { request: jest.fn() },
}));
jest.mock('@/features/superadmin/AdminUI', () => ({
  currency: (v: unknown) => `${v} DH`,
  date: (v: unknown) => String(v),
}));
jest.mock('@/features/crm/documents', () => ({
  escapeHtml: (v: unknown) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;'),
  printCrmDocument: jest.fn(),
}));

const line: EntryLine = {
  key: 'new-1',
  product_id: 42,
  title: 'Produit',
  ref: '0611801',
  qte: 3,
  price: 10.25,
  dateExperation: '2027-05-01',
  hasExpiration: true,
};
const form: EntryFormData = {
  ref: 'ENT-2026',
  date: '2026-10-18',
  provider_id: '8',
  status: '9',
  paymentType: '4',
  paymentStatus: '5',
  discount: '1,25',
  tax: '20',
  paid: '10',
  note: '',
};
describe('commercial API contracts', () => {
  it('reads store envelopes and Laravel resource pagination without losing totals', () => {
    expect(
      pageFrom({ status: true, data: { data: [{ id: 1 }], last_page: 3, total: 45 } }),
    ).toEqual({ rows: [{ id: 1 }], lastPage: 3, total: 45 });
    expect(pageFrom({ data: [{ id: 2 }], meta: { last_page: 7, total: 125 } }).lastPage).toBe(7);
    expect(pageFrom([{ id: 3 }]).total).toBe(1);
    expect(() => payload({ status: false, message: 'Quota atteint' })).toThrow('Quota atteint');
    expect(() => payload({ error: 'Invalid JSON' })).toThrow('Invalid JSON');
    expect(payload({ success: 'Created', id: 5 })).toEqual({ success: 'Created', id: 5 });
  });
  it('uses an amount discount before tax, rounds money and never makes a negative debt', () => {
    expect(entryTotals([line], 1.25, 20, 10)).toMatchObject({
      subtotal: 30.75,
      taxAmount: 5.9,
      total: 35.4,
      due: 25.4,
    });
    const body = entryPayload(form, [line]);
    expect(body).toMatchObject({
      provider_id: 8,
      status: 9,
      paymentType: 4,
      paymentStatus: 5,
      paid: 10,
      discount: 1.25,
      calDiscount: 1.25,
      totalWithTax: 35.4,
    });
    expect(JSON.parse(String(body.dataItems))[0]).toMatchObject({
      product_id: 42,
      qte: 3,
      ref: '0611801',
      dateExperation: '2027-05-01',
    });
    expect(body).not.toHaveProperty('store_id');
    expect(body).not.toHaveProperty('user_id');
  });
  it('refuses invalid quantities, overpayment, excessive discounts and missing expiration', () => {
    expect(() => entryPayload(form, [{ ...line, qte: 1.5 }])).toThrow('quantités');
    expect(() => entryPayload(form, [{ ...line, dateExperation: null }])).toThrow('expiration');
    expect(() => entryPayload({ ...form, paid: '999' }, [line])).toThrow('payé');
    expect(() => entryPayload({ ...form, discount: '999' }, [line])).toThrow('remise');
    expect(() => entryPayload({ ...form, paid: 'oops' }, [line])).toThrow('invalides');
    expect(() => entryPayload({ ...form, paymentStatus: '' }, [line])).toThrow('statuts');
  });
  it('preserves ids and expirations on edit', () => {
    const lines = linesFrom([
      {
        id: 51,
        product_id: 42,
        title: 'Produit',
        qte: 3,
        price: 10.25,
        ref: '0611801',
        dateExperation: '2027-05-01',
      },
    ]);
    expect(JSON.parse(String(entryPayload(form, lines, '70').dataItems))[0]).toMatchObject({
      id: '51',
      product_id: 42,
      dateExperation: '2027-05-01',
    });
  });
  it('keeps fast-entry names and payment status consistent with the backend', () => {
    const r = {
      product_name: 'Produit',
      provider_name: 'Fournisseur',
      quantity: 5,
      buying_price: 4,
      status: 'unpaid' as const,
      paid_amount: 20,
    };
    expect(fastPayload('2026-10-18', [r]).rows[0]?.status).toBe('paid');
    expect(() => fastPayload('2026-10-18', [{ ...r, paid_amount: 21 }])).toThrow();
    expect(() => fastPayload('2026-10-18', [{ ...r, provider_name: '' }])).toThrow();
  });
  it('escapes customer-controlled document text instead of interpreting HTML', () => {
    const html = entryDocumentHtml(
      { ref: '<script>alert(1)</script>', providersName: '<img>', total: 10 },
      [{ title: '<b>Produit</b>', ref: '001', qte: 2, price: 5 }],
      { companyName: 'Pharmacie' },
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('001');
    expect(html).toContain('BON D’ENTRÉE DE STOCK');
  });
  it('connects only the three backend menu entries and keeps their real permission checks', () => {
    const menus = [
      ['Stores', '/stores'],
      ['Customers', '/customers'],
      ['Stock Entry', '/stock-entry'],
    ].map(([label, route], id) => ({
      id,
      header: null,
      label: label!,
      route: route!,
      icon: null,
      parent_id: null,
      order: id,
      hidden: 0,
      public: 0,
      role: '',
      children: [],
    }));
    const access = makeAccess({
      permissions: ['stores.view', 'customers.view', 'entries.view'],
      menus,
    });
    expect(
      backendMenuGroups(access)
        .flatMap((g) => g.items)
        .map((i) => [i.label, i.href, i.disabled]),
    ).toEqual([
      ['Magasins', '/stores', undefined],
      ['Clients', '/customers', undefined],
      ['Entrée', '/entries', undefined],
    ]);
    expect(
      backendMenuGroups({ ...access, permissions: [] })
        .flatMap((g) => g.items)
        .every((i) => i.disabled),
    ).toBe(true);
  });
});
