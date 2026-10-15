import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { printCrmDocument, escapeHtml } from '@/features/crm/documents';
import { stockApi, type CountLine } from './stockApi';
/** Fetch export pages independently of the rendered/filtered counting list. */
export async function exportInventoryReport(id: number, api = stockApi) {
  const rows: CountLine[] = [];
  let page = 1;
  let last = 1;
  let title = 'Inventaire';
  do {
    const result = await api.session(id, { page, per_page: 500 });
    title = result.session.name;
    last = result.lines.last_page;
    rows.push(...result.lines.data);
    page++;
  } while (page <= last);
  const html = `<html><head><style>@page{size:A4;margin:12mm}body{font:12px Arial;color:#0b1c30}h1{color:#00417c}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #c2c6d3;text-align:left;padding:7px}thead{display:table-header-group}</style></head><body><h1>${escapeHtml(title)}</h1><p>Rapport de comptage • ${rows.length} produits • ${new Date().toLocaleDateString('fr-FR')}</p><table><thead><tr><th>Produit</th><th>Référence</th><th>Théorique</th><th>Compté</th><th>Écart</th><th>Motif</th></tr></thead><tbody>${rows.map((l) => `<tr><td>${escapeHtml(l.productName)}</td><td>${escapeHtml(l.sku)}</td><td>${Number(l.expected)}</td><td>${l.counted === null ? 'Non compté' : Number(l.counted)}</td><td>${l.counted === null ? '—' : Number(l.counted) - Number(l.expected)}</td><td>${escapeHtml(l.reason || '')}</td></tr>`).join('')}</tbody></table></body></html>`;
  if (Platform.OS === 'web') await printCrmDocument(html);
  else {
    const file = await Print.printToFileAsync({ html });
    await Print.printAsync({ uri: file.uri });
  }
}
/** SpreadsheetML keeps references as text, including leading zeroes; no cell formulas are emitted. */
export function inventoryWorkbook(rows: CountLine[], title: string) {
  const xml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  const cell = (value: unknown, numeric = false) =>
    `<Cell><Data ss:Type="${numeric ? 'Number' : 'String'}">${xml(value)}</Data></Cell>`;
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Inventaire"><Table><Row>${cell(title)}</Row><Row>${['Produit', 'Référence', 'Théorique', 'Compté', 'Écart', 'Motif'].map((v) => cell(v)).join('')}</Row>${rows.map((l) => `<Row>${cell(l.productName)}${cell(l.sku)}${cell(Number(l.expected), true)}${cell(l.counted === null ? 'Non compté' : Number(l.counted), l.counted !== null)}${cell(l.counted === null ? '' : Number(l.counted) - Number(l.expected), l.counted !== null)}${cell(l.reason)}</Row>`).join('')}</Table></Worksheet></Workbook>`;
}
export async function exportInventoryExcel(id: number, api = stockApi) {
  const rows: CountLine[] = [];
  let page = 1,
    last = 1,
    title = 'Inventaire';
  do {
    const result = await api.session(id, { page, per_page: 500 });
    rows.push(...result.lines.data);
    title = result.session.name;
    last = result.lines.last_page;
    page++;
  } while (page <= last);
  const content = inventoryWorkbook(rows, title),
    filename = `inventaire-${id}.xml`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(
      new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const [{ File, Paths }, Sharing] = await Promise.all([
      import('expo-file-system'),
      import('expo-sharing'),
    ]);
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
    const file = new File(Paths.cache, filename);
    file.write(content);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.ms-excel',
      dialogTitle: 'Exporter l’inventaire pour Excel',
      UTI: 'public.xml',
    });
  }
}
