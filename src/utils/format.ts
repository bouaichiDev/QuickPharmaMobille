/** The dashboard sends amounts as number_format strings ("2840"): parse defensively. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const ISO_CURRENCY = /^[A-Z]{3}$/;

/**
 * Formats an amount with the store currency read from the API (GET /GetSettings).
 * No currency is invented: without one the number is shown alone.
 */
export function formatAmount(
  value: unknown,
  currency: string | null | undefined,
  locale: string,
  fractionDigits = 2,
): string {
  const amount = toNumber(value);
  if (amount === null) return '—';
  const code = currency?.trim().toUpperCase();
  if (code && ISO_CURRENCY.test(code)) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: 0,
      }).format(amount);
    } catch {
      // Unknown ISO code for this runtime: fall through.
    }
  }
  const number = formatNumber(amount, locale, fractionDigits);
  return currency ? `${number} ${currency}` : number;
}

export function formatNumber(value: unknown, locale: string, fractionDigits = 0): string {
  const amount = toNumber(value);
  if (amount === null) return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: fractionDigits }).format(amount);
}

export function formatPercent(value: unknown, locale: string): string {
  const amount = toNumber(value);
  if (amount === null) return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount) + ' %';
}

export function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function shortMonthName(monthIndex: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2024, monthIndex, 1));
}
