export interface BarcodeRead {
  type: string;
  data: string;
}

function validCheckDigit(value: string): boolean {
  let sum = 0;
  for (let i = value.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3)
    sum += Number(value[i]) * weight;
  return (10 - (sum % 10)) % 10 === Number(value[value.length - 1]);
}

/** Validate symbology without truncating codes or discarding leading zeros. */
export function validCameraBarcode({ type, data }: BarcodeRead): boolean {
  const value = data.trim();
  if (!value || value.length > 4096) return false;
  const lengths: Record<string, number | undefined> = { ean13: 13, ean8: 8, upc_a: 12, itf14: 14 };
  const length = lengths[type];
  if (length) return new RegExp(`^\\d{${length}}$`).test(value) && validCheckDigit(value);
  if (type === 'upc_e') {
    if (!/^[01]\d{7}$/.test(value)) return false;
    const ns = value[0],
      digits = value.slice(1, 7),
      check = value[7];
    const last = digits[5]!;
    const expanded =
      Number(last) <= 2
        ? `${ns}${digits.slice(0, 2)}${last}0000${digits.slice(2, 5)}${check}`
        : last === '3'
          ? `${ns}${digits.slice(0, 3)}00000${digits.slice(3, 5)}${check}`
          : last === '4'
            ? `${ns}${digits.slice(0, 4)}00000${digits[4]}${check}`
            : `${ns}${digits.slice(0, 5)}0000${last}${check}`;
    return validCheckDigit(expanded);
  }
  return ['code128', 'code39', 'code93', 'qr', 'datamatrix', 'pdf417'].includes(type);
}

/** Three matching camera frames, not three user scans. Accept once per camera mount. */
export function createBarcodeConsensus() {
  let candidate = '',
    count = 0,
    first = 0,
    last = 0,
    consumed = false;
  return (read: BarcodeRead, now = Date.now()): string | null => {
    if (consumed) return null;
    if (!validCameraBarcode(read)) {
      candidate = '';
      count = 0;
      return null;
    }
    const value = read.data.trim();
    const key = `${read.type}:${value}`;
    if (candidate !== key || now - last > 1200 || now < last) {
      candidate = key;
      count = 1;
      first = last = now;
      return null;
    }
    if (now - last < 70) return null;
    last = now;
    count++;
    if (count < 3 || now - first < 200) return null;
    consumed = true;
    return value;
  };
}
