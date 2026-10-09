import { formPayload, moduleFields } from '@/features/crm/fields';
import { can, canCreate, crmModules } from '@/features/crm/modules';
import { groupStandaloneServices, photoMatchesContext } from '@/features/crm/crmApi';
import { clientDocument } from '@/features/crm/documents';
import { makeAccess, quota } from './fixtures/access';

describe('CRM access and forms', () => {
  const sessions = crmModules.find((module) => module.key === 'sessions')!;
  it('refuses creation while access or quota configuration is missing', () => {
    expect(can(undefined, sessions.view)).toBe(false);
    expect(canCreate(makeAccess({ permissions: [sessions.create!] }), sessions)).toBe(false);
  });
  it('uses effective permission and remaining quota, including unlimited plans', () => {
    const access = makeAccess({
      permissions: [sessions.create!],
      quotas: { [sessions.quota!]: quota({ key: sessions.quota!, remaining: 0, exceeded: true }) },
    });
    expect(canCreate(access, sessions)).toBe(false);
    access.quotas[sessions.quota!]!.unlimited = true;
    expect(canCreate(access, sessions)).toBe(true);
    access.permissions = [];
    expect(canCreate(access, sessions)).toBe(false);
  });
  it('rejects empty required fields, negative money and fractional session counts', () => {
    expect(() => formPayload(moduleFields.services!, {})).toThrow();
    const values = {
      name: 'Soin',
      default_price: '-1',
      duration_minutes: '30',
      recommended_sessions: '1',
    };
    expect(() => formPayload(moduleFields.services!, values)).toThrow();
    expect(() =>
      formPayload(moduleFields.services!, {
        ...values,
        default_price: '100',
        recommended_sessions: '1.5',
      }),
    ).toThrow();
  });
  it('normalizes local decimal input and rejects reversed appointments', () => {
    expect(
      formPayload([{ key: 'price', label: 'Prix', numeric: true }], { price: '12,50' }),
    ).toEqual({ price: 12.5 });
    expect(() =>
      formPayload(moduleFields.appointments!, {
        customer_id: '2',
        service_id: 'service-uid',
        starts_at: '2026-10-08 15:00',
        ends_at: '2026-10-08 14:00',
      }),
    ).toThrow();
  });
});

describe('CRM client dossier boundaries', () => {
  it('keeps package sessions out of the standalone Services tab', () => {
    const service = { uid: 'care-a', name: 'Soin A' };
    const grouped = groupStandaloneServices([
      { service_id: 'care-a', service, customer_service_package_id: null },
      { service_id: 'care-a', service, customer_service_package_id: null },
      { service_id: 'care-a', service, customer_service_package_id: 'pack-a' },
      { service_id: 'care-b', customer_service_package_id: 'pack-b' },
    ]);
    expect(grouped).toEqual([{ service_id: 'care-a', service, sessions_count: 2 }]);
  });
  it('shows only photos belonging to the chosen service, package and session', () => {
    const photo = {
      service_id: 'care-a',
      customer_service_package_id: 'pack-a',
      session_id: 'visit-a',
    };
    expect(photoMatchesContext(photo, { packageId: 'pack-a', serviceId: 'care-a' })).toBe(true);
    expect(photoMatchesContext(photo, { serviceId: 'care-b' })).toBe(false);
    expect(photoMatchesContext(photo, { sessionId: 'visit-b' })).toBe(false);
    expect(photoMatchesContext(photo, { serviceId: 'care-a', standalone: true })).toBe(false);
  });
  it('escapes clinical notes and client names in printable HTML', () => {
    const html = clientDocument(
      { FirstName: '<script>alert(1)</script>', medical_conditions: ['<img src=x>'] },
      [
        {
          service: { name: 'Soin' },
          observation: '<img src=x onerror=alert(2)>',
          prescription: [{ name: 'A&B', instructions: '<script>bad()</script>' }],
        },
      ],
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A&amp;B');
  });
  it('preserves CIN and the active state in the client form payload', () => {
    const payload = formPayload(moduleFields.clients!, {
      FirstName: 'Sofia',
      Email: 'sofia@example.com',
      Cin: 'BE89210',
      Active: '0',
    });
    expect(payload).toMatchObject({ Cin: 'BE89210', Active: 0 });
  });
});
