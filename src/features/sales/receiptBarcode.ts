// Code 128 Table B (Subset of common characters)
// Pattern: value (0-106) -> widths [b, s, b, s, b, s]
// We use the binary string representation for easier rendering: 1=bar, 0=space.
// Each symbol is 11 modules wide. Stop symbol is 13.

const CODE128_PATTERNS: Record<number, string> = {
  0: '11011001100',
  1: '11001101100',
  2: '11001100110',
  3: '10010011000',
  4: '10010001100',
  5: '10001001100',
  6: '10011001000',
  7: '10011000100',
  8: '10001100100',
  9: '11001001000',
  10: '11001000100',
  11: '11000100100',
  12: '10110011100',
  13: '10011011100',
  14: '10011001110',
  15: '10111001100',
  16: '10011101100',
  17: '10011100110',
  18: '11001110010',
  19: '11001011100',
  20: '11001001110',
  21: '11011100100',
  22: '11001110100',
  23: '11101101110',
  24: '11101001100',
  25: '11100101100',
  26: '11100100110',
  27: '11101100100',
  28: '11100110100',
  29: '11100110010',
  30: '11011011000',
  31: '11011000110',
  32: '11000110110',
  33: '10100011000',
  34: '10001011000',
  35: '10001000110',
  36: '10110001000',
  37: '10001101000',
  38: '10001100010',
  39: '11010001000',
  40: '11000101000',
  41: '11000100010',
  42: '10110111000',
  43: '10110001110',
  44: '10001101110',
  45: '10111011000',
  46: '10111000110',
  47: '10001110110',
  48: '11101110110',
  49: '11010001110',
  50: '11000101110',
  51: '11011101000',
  52: '11011100010',
  53: '11011101110',
  54: '11101011000',
  55: '11101000110',
  56: '11100010110',
  57: '11101101000',
  58: '11101100010',
  59: '11100011010',
  60: '11101111010',
  61: '11001000010',
  62: '11110010100',
  63: '10110000100',
  64: '10100110000',
  65: '10100001100',
  66: '10010110000',
  67: '10010000110',
  68: '10000101100',
  69: '10000100110',
  70: '10110010000',
  71: '10110000100',
  72: '10011010000',
  73: '10011000010',
  74: '10000110100',
  75: '10000110010',
  76: '11000010010',
  77: '11001010000',
  78: '11110111010',
  79: '11000010100',
  80: '10001111010',
  81: '10100111100',
  82: '10010111100',
  83: '10010011110',
  84: '10111100100',
  85: '10011110100',
  86: '10011110010',
  87: '11110100100',
  88: '11110010100',
  89: '11110010010',
  90: '11011011110',
  91: '11011110110',
  92: '11110110110',
  93: '10101111000',
  94: '10100011110',
  95: '10001011110',

  96: '10111100010',
  97: '11110101000',
  98: '11110100010',
  99: '10111011110',
  100: '10111101110',
  101: '11101011110',
  102: '11110101110',
  // Start Codes
  103: '11010000100', // Start A
  104: '11010010000', // Start B
  105: '11010011100', // Start C

  // Stop Code
  106: '1100011101011', // Stop (13 modules)
};

/**
 * Generates data for a Code 128 B barcode.
 * Supports printable ASCII characters (32-126).
 * Returns an array of bars/spaces.
 */
export const generateCode128 = (text: string) => {
  // Filter for valid Code 128 B characters (ASCII 32-126)
  const validText = text.replace(/[^\x20-\x7E]/g, '');

  // Start Code B
  const startCode = 104;
  let checksum = startCode;

  // Build patterns array
  let patterns: string[] = [CODE128_PATTERNS[startCode]!];

  for (let i = 0; i < validText.length; i++) {
    const charCode = validText.charCodeAt(i);
    const tableIndex = charCode - 32; // Table B starts at space (32) mapping to index 0

    // Add to checksum: (value * position)
    // Position starts at 1 for the first data character
    checksum += tableIndex * (i + 1);

    patterns.push(CODE128_PATTERNS[tableIndex] || CODE128_PATTERNS[0]!);
  }

  // Final checksum
  checksum = checksum % 103;
  patterns.push(CODE128_PATTERNS[checksum]!);

  // Stop Code
  patterns.push(CODE128_PATTERNS[106]!);

  // Convert patterns string "110..." to array of { width, isBlack }
  const fullString = patterns.join('');
  const bars: { width: number; isBlack: boolean }[] = [];

  // Add Quiet Zone (10 modules white space)
  bars.push({ width: 10, isBlack: false });

  let currentRun = 0;
  let currentChar = fullString[0];

  for (let i = 0; i < fullString.length; i++) {
    if (fullString[i] === currentChar) {
      currentRun++;
    } else {
      bars.push({
        width: currentRun,
        isBlack: currentChar === '1',
      });
      currentRun = 1;
      currentChar = fullString[i];
    }
  }
  // Push last run
  bars.push({
    width: currentRun,
    isBlack: currentChar === '1',
  });

  // Add Quiet Zone
  bars.push({ width: 10, isBlack: false });

  return bars;
};

export function receiptBarcode(reference: string) {
  const value = reference.split('-').pop() || reference;
  return /^[\x20-\x7e]+$/.test(value) ? generateCode128(value) : [];
}
