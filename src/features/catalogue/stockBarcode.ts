import { generateCode128 } from '@/features/sales/receiptBarcode';
/** Actual machine-readable encoding; fallback supports legacy alphanumeric references. */
const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const parity = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];
export function barcodePattern(code: string): {
  format: string;
  bars: { width: number; isBlack: boolean }[];
} {
  if (
    /^\d{13}$/.test(code) &&
    code
      .split('')
      .slice(0, 12)
      .reduce((sum, d, i) => sum + Number(d) * (i % 2 ? 3 : 1), 0) %
      10 ===
      (10 - Number(code[12])) % 10
  ) {
    let bits = '00000000000101';
    const first = Number(code[0]);
    for (let i = 1; i <= 6; i++) bits += (parity[first]![i - 1] === 'L' ? L : G)[Number(code[i])];
    bits += '01010';
    for (let i = 7; i <= 12; i++)
      bits += L[Number(code[i])]!.split('')
        .map((b) => (b === '1' ? '0' : '1'))
        .join('');
    bits += '10100000000000';
    const bars: { width: number; isBlack: boolean }[] = [];
    for (const bit of bits) {
      const prev = bars[bars.length - 1];
      if (prev && prev.isBlack === (bit === '1')) prev.width++;
      else bars.push({ width: 1, isBlack: bit === '1' });
    }
    return { format: 'EAN-13', bars };
  }
  return { format: 'CODE 128', bars: /^[\x20-\x7e]+$/.test(code) ? generateCode128(code) : [] };
}
export function barcodeHtml(code: string, name: string) {
  const { bars } = barcodePattern(code);
  const total = bars.reduce((n, b) => n + b.width, 0);
  let x = 0;
  const rectangles = bars
    .map((b) => {
      const rect = b.isBlack ? `<rect x="${x}" y="0" width="${b.width}" height="40"/>` : '';
      x += b.width;
      return rect;
    })
    .join('');
  const safe = (text: string) =>
    text.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  return `<html><head><style>@page{size:50mm 30mm;margin:2mm}body{margin:0;text-align:center;font-family:Arial;font-size:8px}svg{display:block;width:100%;height:18mm}p{margin:0;overflow:hidden}.name{height:5mm;line-height:2.5mm}.code{height:3mm;line-height:3mm;white-space:nowrap;font-family:monospace}</style></head><body><p class="name">${safe(name)}</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} 40">${rectangles}</svg><p class="code">${safe(code)}</p></body></html>`;
}
