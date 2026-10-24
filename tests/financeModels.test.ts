import { financePage, chequeActions, chequePayload } from '@/features/finance/model';
import { pushTarget } from '@/features/notifications/pushModel';
const form = {
  type_id: '3',
  amount: '3200,50',
  cheque_number: '0012',
  bank_name: 'Banque',
  account_holder: 'Client',
  issue_date: '2026-10-23',
  due_date: '2026-10-28',
  customer_id: '7',
  notes: 'Note',
};
it('preserves custom pagination for alerts/cheques instead of stopping after page one', () => {
  expect(
    financePage({
      success: true,
      data: {
        data: [{ uid: 'alert-a' }],
        pagination: { current_page: 1, last_page: 4, total: 72 },
      },
    }),
  ).toMatchObject({ rows: [{ uid: 'alert-a' }], lastPage: 4, total: 72 });
});
it('retains global credit summary and stable customer identifiers across pages', () => {
  expect(
    financePage({
      customers: [{ customer_id: 8, total_credit: 300 }],
      last_page: 3,
      total_customers_with_credit: 42,
      total_credit_amount: 9000,
    }),
  ).toMatchObject({
    rows: [{ id: 8, customer_id: 8 }],
    lastPage: 3,
    total: 42,
    summary: { total_credit_amount: 9000 },
  });
});
it.each(['pending', 'postdated'])('allows deposit but never encashment for %s', (code) => {
  expect(chequeActions({ status: { code } })).toMatchObject({
    deposit: true,
    clear: false,
    reject: false,
    cancel: true,
    edit: true,
  });
});
it.each(['deposited', 'processing'])(
  'only allows clearing/rejection after deposit for %s',
  (code) => {
    expect(chequeActions({ status: { code } })).toMatchObject({
      deposit: false,
      clear: true,
      reject: true,
      cancel: false,
      edit: false,
      delete: false,
    });
  },
);
it.each(['cleared', 'rejected', 'cancelled'])(
  'does not offer stale financial actions for %s',
  (code) => {
    expect(Object.values(chequeActions({ status: { code } })).every((v) => !v)).toBe(true);
  },
);
it('whitelists cheque fields and normalizes French amounts without submitting author or status', () => {
  expect(chequePayload({ ...form, user_id: 900, store_id: 900, status_id: 5 })).toEqual({
    ...form,
    type_id: 3,
    amount: 3200.5,
    customer_id: 7,
    provider_id: null,
  });
});
it.each([{ amount: '0' }, { amount: 'NaN' }, { due_date: '2026-10-01' }, { issue_date: '' }])(
  'rejects invalid cheque payload %j',
  (changes) => expect(() => chequePayload({ ...form, ...changes })).toThrow(),
);
it('only opens supported push targets in the current authenticated store', () => {
  expect(
    pushTarget({ kind: 'alert', id: 'alert-a', store_key: 'encrypted-store' }, 'encrypted-store'),
  ).toEqual({ module: 'alerts', id: 'alert-a' });
  expect(
    pushTarget({ kind: 'cheque', id: 'cheque-a', store_key: 'encrypted-store' }, 'encrypted-store'),
  ).toEqual({ module: 'cheques', id: 'cheque-a' });
  expect(
    pushTarget({ kind: 'alert', id: 'alert-a', store_key: 'other-store' }, 'encrypted-store'),
  ).toBeNull();
  expect(
    pushTarget(
      { kind: 'external', id: 'https://example.com', store_key: 'encrypted-store' },
      'encrypted-store',
    ),
  ).toBeNull();
  expect(pushTarget(undefined, 'encrypted-store')).toBeNull();
});
