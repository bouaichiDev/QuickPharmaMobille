import { isPlatformPush } from '@/features/notifications/pushModel';

it('only accepts platform pushes for the signed-in SuperAdmin', () => {
  const data = { kind: 'platform_notification', id: '31', user_key: 'opaque-user' };
  expect(isPlatformPush(data, 'SuperAdmin', 'opaque-user')).toBe(true);
  expect(isPlatformPush(data, 'Admin', 'opaque-user')).toBe(false);
  expect(isPlatformPush(data, 'SuperAdmin', 'another-user')).toBe(false);
  expect(isPlatformPush({ ...data, id: '../users' }, 'SuperAdmin', 'opaque-user')).toBe(false);
  expect(isPlatformPush(undefined, 'SuperAdmin', 'opaque-user')).toBe(false);
});
