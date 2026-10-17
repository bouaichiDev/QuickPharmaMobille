import { itemName, record, type CrmRecord } from './crmApi';

export function remainingPackageServices(pkg: CrmRecord) {
  const usage = record(pkg.service_usage);
  const items =
    Array.isArray(pkg.service_items) && pkg.service_items.length
      ? pkg.service_items.map(record)
      : [{ service_id: pkg.service_id, sessions_count: pkg.sessions_total }];
  return items.filter(
    (item) =>
      item.service_id && Number(item.sessions_count) > Number(usage[String(item.service_id)] ?? 0),
  );
}
export function eligibleSessionPackage(pkg: CrmRecord) {
  return (
    pkg.status === 'active' &&
    Number(pkg.remaining_sessions ?? Number(pkg.sessions_total) - Number(pkg.sessions_used ?? 0)) >
      0 &&
    (!pkg.expiration_date ||
      String(pkg.expiration_date).slice(0, 10) >= new Date().toISOString().slice(0, 10)) &&
    remainingPackageServices(pkg).length > 0
  );
}
export function changeSessionIdentity(old: Record<string, string>, key: string, value: string) {
  const next = { ...old, [key]: value };
  if (key === 'customer_id')
    return {
      ...next,
      customer_service_package_id: '',
      service_id: '',
      price: '',
      duration_minutes: '',
      discount: '',
      amount_paid: '',
    };
  if (key === 'service_id')
    return {
      ...next,
      customer_service_package_id: '',
      price: '',
      duration_minutes: '',
      discount: '',
      amount_paid: '',
    };
  if (key === 'customer_service_package_id')
    return {
      ...next,
      service_id: '',
      price: '',
      duration_minutes: '',
      discount: '',
      amount_paid: '',
    };
  return next;
}
export function referenceLabel(row: CrmRecord, key: string) {
  if (key === 'employee_id')
    return (
      [row.firstName ?? row.FirstName, row.lastName ?? row.LastName].filter(Boolean).join(' ') ||
      String(row.name || row.email || 'Utilisateur')
    );
  if (key === 'customer_service_package_id')
    return `${itemName(record(row.service_package)) || itemName(row) || 'Forfait client'} — ${Number(row.remaining_sessions ?? Number(row.sessions_total) - Number(row.sessions_used ?? 0))} séances restantes`;
  return itemName(row) || itemName(record(row.service_package)) || String(row.code ?? row.id ?? '');
}
export function userRole(row: CrmRecord) {
  const role = record(row.role);
  return String(role.label ?? role.name ?? row.roleLabel ?? row.code ?? 'Autres utilisateurs');
}

/** Blank optional amounts must use zero: the database columns are non-nullable. */
export function normalizeSessionAmounts(payload: CrmRecord) {
  for (const key of ['discount', 'amount_paid']) {
    if (key in payload && payload[key] === null) payload[key] = 0;
  }
  return payload;
}
