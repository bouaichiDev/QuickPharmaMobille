import type { StockLocation, StockProduct, LocationMetadata } from './stockApi';
export function readMetadata<T extends object>(raw: string | T | null | undefined): Partial<T> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
export const locationZones = [
  ['all', 'Tous'],
  ['otc', 'Vente libre'],
  ['prescription', 'Ordonnance'],
  ['cold', 'Frigo & Froid'],
  ['reserve', 'Réserve'],
  ['secure', 'Zone sécurisée'],
] as [string, string][];
export function locationInfo(l: StockLocation) {
  const m = readMetadata<LocationMetadata>(l.metadata);
  const text = (l.name + ' ' + (l.description || '')).toLowerCase();
  const zone =
    m.zone ||
    (/frigo|froid/.test(text)
      ? 'cold'
      : /stup|sécur|sous clé/.test(text)
        ? 'secure'
        : /réserve|reserve|palette/.test(text)
          ? 'reserve'
          : /ordonnance|antibioti/.test(text)
            ? 'prescription'
            : /nature|herbor|conseil/.test(text)
              ? 'natural'
              : /vente libre|antalg/.test(text)
                ? 'otc'
                : 'other');
  const icons = {
    cold: 'ac-unit',
    secure: 'lock',
    reserve: 'inventory-2',
    prescription: 'medication',
    natural: 'eco',
    otc: 'view-module',
    other: 'view-module',
  } as const;
  const labels = {
    cold: 'Zone chaîne du froid',
    secure: 'Zone sous clé réglementaire',
    reserve: 'Zone arrière-boutique',
    prescription: 'Zone ordonnance comptoir',
    natural: 'Zone conseil parapharmacie',
    otc: 'Zone vente libre',
    other: 'Zone de stockage',
  };
  const key = zone in icons ? (zone as keyof typeof icons) : 'other';
  return {
    ...m,
    zone,
    icon: icons[key],
    label: labels[key],
    occupancy:
      m.capacity && m.capacity > 0
        ? Math.round((Number(l.quantity) * 100) / m.capacity)
        : undefined,
  };
}
export function productInfo(p: StockProduct) {
  const m = readMetadata<Record<string, unknown>>(p.medicine_catalog_metadata);
  const selling = Number(p.sellingPrice) || 0,
    buying = Number(p.buyingPrice) || 0;
  const tax = Number(p.tax) || 0;
  return {
    manufacturer: p.manufacturer || String(m.epi || m.manufacturer || ''),
    substance: p.active_substance || String(m.active_substance || ''),
    form: p.FORME || String(m.form || ''),
    presentation: String(m.presentation || p.description || ''),
    tax,
    // Display the existing price model: inclusive when configured, otherwise add the configured tax.
    ttc: Number(p.includeTaxInPrice) === 1 ? selling : selling * (1 + tax / 100),
    margin: selling ? ((selling - buying) * 100) / selling : 0,
    gain: selling - buying,
  };
}
