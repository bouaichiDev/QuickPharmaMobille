import { record, type CrmRecord } from './crmApi';

export function linkedAppointmentSession(row: CrmRecord): string {
  return String(row.session_id ?? '').trim();
}

export function canConvertAppointment(row: CrmRecord): boolean {
  const status = record(row.status).code ?? row.status;
  const generated = row.generated_from_session;
  return (
    !linkedAppointmentSession(row) &&
    generated !== true &&
    generated !== 1 &&
    generated !== '1' &&
    !['completed', 'cancelled', 'no_show'].includes(String(status))
  );
}
