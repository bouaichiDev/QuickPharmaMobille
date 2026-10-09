import type { CrmRecord } from './crmApi';

export function customDefault(field: CrmRecord, value: unknown) {
  const raw = value ?? field.default_value ?? '';
  if (['checkbox', 'switch'].includes(String(field.type)))
    return raw === true || raw === 1 || raw === '1' || raw === 'true' ? 1 : 0;
  if (field.type === 'multiselect') {
    if (Array.isArray(raw)) return raw.map(String);
    try {
      const parsed: unknown = JSON.parse(String(raw));
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* legacy plain value */
    }
    return raw ? [String(raw)] : [];
  }
  return raw;
}
