import createQrCode from 'qrcode-generator';
export function locationQr(code: string) {
  Object.assign(createQrCode, {
    stringToBytes: (value: string) => {
      const encoded = encodeURIComponent(value);
      const bytes: number[] = [];
      for (let i = 0; i < encoded.length; i++) {
        if (encoded[i] === '%') {
          bytes.push(parseInt(encoded.slice(i + 1, i + 3), 16));
          i += 2;
        } else bytes.push(encoded.charCodeAt(i));
      }
      return bytes;
    },
  });
  const qr = createQrCode(0, 'M');
  qr.addData(code);
  qr.make();
  return qr;
}
