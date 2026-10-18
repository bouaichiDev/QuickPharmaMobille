import { supplierPayload } from '@/features/commerce/supplierModel';
import { orderLines, orderPayload, type OrderFormData } from '@/features/commerce/orderModel';
import { parseReport, reportCsv, reportParams, reportsApi } from '@/features/commerce/reportsApi';
import { apiGet } from '@/services/api/client';
import { backendMenuGroups } from '@/features/navigation/backendMenu';
import { makeAccess } from './fixtures/access';
jest.mock('@/services/api/client', () => ({ apiGet: jest.fn(), apiPost: jest.fn() }));
const form: OrderFormData = {
  ref: 'CMD-1',
  date: '2026-10-18',
  customer: '4',
  status: '3',
  discount: '10',
  tax: '20',
  paid: '100',
  note: '',
};
const lines = orderLines([
  { id: 9, product_id: 42, title: 'Produit', ref: '001234', qte: 2, price: 100, discount: 5 },
]);
const filters = { startDate: '2026-10-01', endDate: '2026-10-18', status: 'all', search: '' };
beforeEach(() => jest.clearAllMocks());
it('serializes suppliers with the exact web fields and no forgeable tenant identity', () => {
  const result = supplierPayload(
    {
      name: ' Fournisseur ',
      code: 'F-1',
      phone: '0600000000',
      email: 'test@example.org',
      active: 1,
      CreditCeiling: '100,50',
      DefaultDiscount: '5',
      store_id: 999,
      user_id: 999,
    },
    '7',
  );
  expect(result).toMatchObject({
    id: '7',
    name: 'Fournisseur',
    CreditCeiling: 100.5,
    DefaultDiscount: 5,
  });
  expect(result).not.toHaveProperty('store_id');
  expect(result).not.toHaveProperty('user_id');
  expect(() => supplierPayload({ name: 'F', code: 'F', phone: '01', email: 'invalide' })).toThrow(
    'e-mail',
  );
});
it('saves customer orders with reserved quantities, line discounts and no fictional payment mode', () => {
  const result = orderPayload(form, lines, '18');
  expect(result).toMatchObject({
    id: '18',
    customer_id: 4,
    status: 3,
    subTotal: 190,
    calDiscount: 19,
    total: 205.2,
    paid: 100,
    due: 105.2,
  });
  expect(JSON.parse(String(result.dataItems))[0]).toMatchObject({
    product_id: 42,
    qte: 2,
    ref: '001234',
    discount: 5,
    callDiscount: 10,
    total: 190,
    dateExperation: null,
  });
  expect(result).not.toHaveProperty('paymentType');
  expect(result).not.toHaveProperty('paymentStatus');
  expect(result).not.toHaveProperty('store_id');
});
it('rejects invalid order quantities, overpayment and dates before sending writes', () => {
  expect(() => orderPayload(form, [{ ...lines[0]!, quantity: 3 }])).toThrow('Quantité');
  expect(() => orderPayload({ ...form, paid: '999' }, lines)).toThrow('acompte');
  expect(() => orderPayload({ ...form, date: 'not-a-date' }, lines)).toThrow('date');
});
it('parses period-wide report summaries without summing only the visible page', () => {
  expect(
    parseReport(
      {
        sales: [{ id: 1, totalAmount: 10 }],
        pagination: { total: 80, totalPages: 4 },
        summary: { totalAmount: 8000, totalPaid: 5000 },
      },
      'sales',
      1,
    ),
  ).toMatchObject({ total: 80, lastPage: 4, summary: { totalAmount: 8000 } });
  expect(
    parseReport(
      { data: [], total: 5, last_page: 2, summary: { availableStock: 120 } },
      'products',
      1,
    ).summary.availableStock,
  ).toBe(120);
});
it('uses the web report parameter names and rejects reversed periods', () => {
  expect(reportParams('products', filters, 2)).toMatchObject({
    date: filters.startDate,
    dateTo: filters.endDate,
    page: 2,
    perPage: 20,
  });
  expect(() => reportParams('sales', { ...filters, startDate: '2027-01-01' })).toThrow('période');
});
it('exports all requested pages up to a disclosed cap rather than requesting an unbounded export', async () => {
  jest.mocked(apiGet).mockImplementation(async (_path, config) => {
    const page = Number(config?.params?.page ?? 1);
    return {
      sales: Array.from({ length: 100 }, (_, index) => ({ id: (page - 1) * 100 + index })),
      pagination: { total: 1500, totalPages: 15 },
      summary: { totalAmount: 15000 },
    } as never;
  });
  const result = await reportsApi.exportRows('sales', filters);
  expect(result.rows).toHaveLength(1000);
  expect(result.truncated).toBe(true);
  expect(apiGet).toHaveBeenCalledTimes(10);
  expect(jest.mocked(apiGet).mock.calls.every(([, options]) => !options?.params?.export)).toBe(
    true,
  );
});
it('escapes CSV cells and prevents spreadsheet formula injection', () => {
  const csv = reportCsv('sales', [
    { saleNumber: '=HYPERLINK("bad")', customer: 'Nom; "test"', totalAmount: 10 },
  ]);
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('Nom; ""test""');
});
it('enables the three supplied modules while honoring the backend menu permissions', () => {
  const access = makeAccess({ permissions: ['suppliers.view', 'orders.view', 'reports.view'] });
  const menus = ['/suppliers', '/orders', '/reports'].map((route, i) => ({
    id: i,
    header: null,
    icon: null,
    parent_id: null,
    public: 0,
    role: 'Admin',
    label: ['Suppliers', 'Orders', 'Reports'][i]!,
    route,
    order: i,
    hidden: 0,
    children: [],
  }));
  const items = backendMenuGroups(access, menus).flatMap((group) => group.items);
  expect(items.map((item) => item.label)).toEqual(['Fournisseurs', 'Commandes', 'Rapports']);
  expect(items.every((item) => !item.disabled)).toBe(true);
  expect(
    backendMenuGroups(makeAccess({ permissions: [] }), menus)
      .flatMap((group) => group.items)
      .every((item) => item.disabled),
  ).toBe(true);
});
