import {
  changeSessionIdentity,
  eligibleSessionPackage,
  remainingPackageServices,
  referenceLabel,
  userRole,
  normalizeSessionAmounts,
} from '@/features/crm/sessionForm';
import { formPayload, moduleFields } from '@/features/crm/fields';

const pkg = {
  uid: 'pack',
  status: 'active',
  sessions_total: 4,
  sessions_used: 1,
  remaining_sessions: 3,
  service_id: 'face',
  service_items: [
    { service_id: 'face', sessions_count: 2 },
    { service_id: 'body', sessions_count: 2 },
  ],
  service_usage: { face: 2, body: 0 },
  service_package: { name: 'Bien-être' },
};
it('switches from a customer package to a standalone service without sending conflicting package IDs', () => {
  const values = changeSessionIdentity(
    {
      customer_id: '12',
      customer_service_package_id: 'pack',
      service_id: 'body',
      price: '200',
      duration_minutes: '40',
      amount_paid: '80',
      discount: '10',
    },
    'service_id',
    'face',
  );
  const payload = formPayload(moduleFields.sessions!, {
    ...values,
    price: '450',
    duration_minutes: '45',
    session_date: '2026-10-10T10:00',
  });
  expect(payload).toMatchObject({
    customer_id: 12,
    service_id: 'face',
    customer_service_package_id: null,
    price: 450,
    discount: null,
    amount_paid: null,
  });
  expect(payload).not.toHaveProperty('service_package_id');
});
it('changing customer clears the previous patient’s treatment and payment selections', () => {
  expect(
    changeSessionIdentity(
      { service_id: 'face', customer_service_package_id: 'pack', amount_paid: '100', price: '200' },
      'customer_id',
      '13',
    ),
  ).toMatchObject({
    customer_id: '13',
    service_id: '',
    customer_service_package_id: '',
    price: '',
    amount_paid: '',
  });
});
it('keeps only active, unexpired packages with an available included service', () => {
  expect(eligibleSessionPackage(pkg)).toBe(true);
  expect(remainingPackageServices(pkg)).toEqual([{ service_id: 'body', sessions_count: 2 }]);
  expect(eligibleSessionPackage({ ...pkg, status: 'cancelled' })).toBe(false);
  expect(eligibleSessionPackage({ ...pkg, remaining_sessions: 0 })).toBe(false);
  expect(eligibleSessionPackage({ ...pkg, expiration_date: '2000-01-01' })).toBe(false);
  expect(eligibleSessionPackage({ ...pkg, service_usage: { face: 2, body: 2 } })).toBe(false);
});
it('shows user names under their roles, not role codes as selectable employee names', () => {
  const user = {
    id: 7,
    firstName: 'Nadia',
    lastName: 'Benali',
    email: 'nadia@example.invalid',
    code: 'service_staff',
  };
  expect(referenceLabel(user, 'employee_id')).toBe('Nadia Benali');
  expect(userRole(user)).toBe('service_staff');
  expect(
    referenceLabel({ id: 8, email: 'staff@example.invalid', code: 'admin' }, 'employee_id'),
  ).toBe('staff@example.invalid');
});
it('identifies the customer package by its name and remaining sessions', () => {
  expect(referenceLabel(pkg, 'customer_service_package_id')).toBe(
    'Bien-être — 3 séances restantes',
  );
});

it('does not send null into non-nullable optional money columns when creating a standalone session', () => {
  expect(
    normalizeSessionAmounts({ price: 450, discount: null, amount_paid: null, employee_id: null }),
  ).toEqual({ price: 450, discount: 0, amount_paid: 0, employee_id: null });
  expect(normalizeSessionAmounts({ price: 450 })).toEqual({ price: 450 });
});
