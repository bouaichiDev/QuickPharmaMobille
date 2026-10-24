import { adminPage } from '@/features/admin/api';
import { ageGroupPayload, userPayload, safeAudit, auditValues } from '@/features/admin/model';
import { invoiceLine, invoicePreview } from '@/features/admin/invoiceModel';
jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  httpClient: { request: jest.fn() },
}));
jest.mock('@/features/commerce/CommerceUI', () => ({ useCommerceAccess: jest.fn() }));
it('keeps server pagination for invoices, audit envelopes and raw user lists', () => {
  expect(
    adminPage({ success: true, data: [{ id: 1 }], meta: { total: 75, last_page: 4 } }),
  ).toEqual({ rows: [{ id: 1 }], total: 75, lastPage: 4 });
  expect(
    adminPage({ status: 'success', data: { data: [{ id: 2 }], total: 36, last_page: 2 } }).total,
  ).toBe(36);
  expect(adminPage({ data: [{ id: 3 }], total: 50, last_page: 3 }).lastPage).toBe(3);
  expect(() => adminPage({ status: 'error', message: 'Access denied' })).toThrow('Access denied');
  expect(() => adminPage({ success: true, data: {} })).toThrow('Réponse de liste invalide');
});
it('validates age ranges and sends no forged actor or store fields', () => {
  expect(
    ageGroupPayload({
      name: ' Adultes ',
      min_age: '18',
      max_age: '64',
      store_id: 999,
      user_id: 99,
    }),
  ).toEqual({ name: 'Adultes', min_age: 18, max_age: 64, description: '' });
  expect(() => ageGroupPayload({ name: 'Adultes', min_age: 18, max_age: 17 })).toThrow();
  expect(() => ageGroupPayload({ name: 'Adultes', min_age: 1.5, max_age: 10 })).toThrow();
});
it('does not send a blank password during a user edit or expose actor fields', () => {
  expect(
    userPayload(
      {
        id: 5,
        firstName: 'A',
        lastName: 'B',
        phone: '0612345678',
        email: 'a@b.ma',
        role: 3,
        active: true,
        initialise: false,
        password: '',
        store_id: 999,
      },
      true,
    ),
  ).toEqual({
    id: 5,
    firstName: 'A',
    lastName: 'B',
    phone: '0612345678',
    email: 'a@b.ma',
    role: 3,
    active: 1,
    initialise: 0,
  });
  expect(() =>
    userPayload({ firstName: 'A', lastName: 'B', phone: '1', email: 'a@b.ma', role: 3 }, false),
  ).toThrow();
});
it('redacts nested audit secrets and parses both JSON and object snapshots', () => {
  expect(safeAudit({ password: 'secret', nested: { access_token: 'private', name: 'A' } })).toEqual(
    { password: '••••••', nested: { access_token: '••••••', name: 'A' } },
  );
  expect(auditValues('{"role":"vendeur","password":"secret"}')).toEqual({
    role: 'vendeur',
    password: '••••••',
  });
  expect(auditValues('malformed')).toEqual({});
});
it('matches invoice service line discounts, taxes, precision and permitted maxima', () => {
  const settings = {
    allow_line_discount: true,
    max_line_discount_percent: 10,
    allow_invoice_discount: true,
    max_invoice_discount_percent: 15,
    rounding_mode: 'round',
    rounding_precision: 2,
  };
  expect(
    invoicePreview(
      [
        {
          label: 'A',
          quantity: 3,
          unit_price: 100,
          tax_rate: 20,
          discount_type: 'percent',
          discount_value: 10,
        },
      ],
      settings,
      'percent',
      0,
    ),
  ).toMatchObject({ subtotal: 300, lineDiscount: 30, base: 270, tax: 54, total: 324 });
  expect(
    invoicePreview(
      [
        {
          label: 'A',
          quantity: 1,
          unit_price: 100,
          tax_rate: 0,
          discount_type: 'percent',
          discount_value: 50,
        },
      ],
      settings,
      'percent',
      30,
    ),
  ).toMatchObject({ lineDiscount: 10, discount: 15, total: 75 });
  expect(() => invoiceLine({ label: 'A', quantity: 0, unit_price: 1 })).toThrow();
  expect(() => invoiceLine({ label: 'A', quantity: 1, unit_price: 1, tax_rate: 101 })).toThrow();
  expect(
    invoiceLine({
      label: 'Article',
      quantity: 2,
      unit_price: 3,
      tax_rate: 20,
      discount_value: 0,
      store_id: 123,
    }),
  ).not.toHaveProperty('store_id');
});
