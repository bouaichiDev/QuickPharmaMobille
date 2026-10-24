import { record } from '@/features/crm/crmApi';
import type { Row } from './api';

export function ageGroupPayload(row: Row) {
  const name = String(row.name ?? '').trim(),
    min = Number(row.min_age),
    max = Number(row.max_age);
  if (name.length < 2 || !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min)
    throw new Error(
      'Renseignez un nom et des âges entiers : maximum supérieur ou égal au minimum.',
    );
  return { name, min_age: min, max_age: max, description: String(row.description ?? '') };
}
export function userPayload(row: Row, editing: boolean) {
  const data = {
    firstName: String(row.firstName ?? '').trim(),
    lastName: String(row.lastName ?? '').trim(),
    email: String(row.email ?? '').trim(),
    phone: String(row.phone ?? '').trim(),
    role: row.role,
    active: row.active ? 1 : 0,
    initialise: row.initialise ? 1 : 0,
  };
  if (
    !data.firstName ||
    !data.lastName ||
    !data.phone ||
    !/^\S+@\S+\.\S+$/.test(data.email) ||
    !data.role ||
    (!editing && !String(row.password ?? ''))
  )
    throw new Error('Renseignez les informations obligatoires et un e-mail valide.');
  return { ...data, ...(editing ? { id: row.id } : { password: String(row.password) }) };
}
const sensitive = /password|token|secret|authorization|cookie|api[_-]?key/i;
export function safeAudit(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[Données imbriquées]';
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => safeAudit(v, depth + 1));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        sensitive.test(k) ? '••••••' : safeAudit(v, depth + 1),
      ]),
    );
  if (typeof value === 'string') {
    if (/^\s*[\[{]/.test(value)) {
      try {
        return safeAudit(JSON.parse(value), depth + 1);
      } catch {
        /* Keep non-JSON text readable. */
      }
    }
    return value
      .slice(0, 4000)
      .replace(/Bearer\s+[a-z0-9._~-]+/gi, 'Bearer ••••••')
      .replace(/((?:password|token|api[_-]?key|secret)\s*[=:]\s*)[^\s&,;]+/gi, '$1••••••');
  }
  return value;
}
export function auditValues(value: unknown): Row {
  if (typeof value === 'string') {
    try {
      return record(safeAudit(JSON.parse(value)));
    } catch {
      return {};
    }
  }
  return record(safeAudit(value));
}
