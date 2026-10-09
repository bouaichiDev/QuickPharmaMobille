import {
  canConvertAppointment,
  linkedAppointmentSession,
} from '../src/features/crm/appointmentSession';

describe('appointment session actions', () => {
  it('opens an existing session and prevents converting it again', () => {
    const row = { session_id: 'session-123', status: { code: 'confirmed' } };
    expect(linkedAppointmentSession(row)).toBe('session-123');
    expect(canConvertAppointment(row)).toBe(false);
  });
  it.each([true, 1, '1'])('blocks appointments generated from sessions (%s)', (generated) => {
    expect(canConvertAppointment({ generated_from_session: generated })).toBe(false);
  });
  it.each(['completed', 'cancelled', 'no_show'])('blocks terminal appointments (%s)', (status) => {
    expect(canConvertAppointment({ status: { code: status } })).toBe(false);
  });
  it('allows an unlinked confirmed appointment', () => {
    expect(
      canConvertAppointment({
        session_id: null,
        generated_from_session: false,
        status: { code: 'confirmed' },
      }),
    ).toBe(true);
  });
});
