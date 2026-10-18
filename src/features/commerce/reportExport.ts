import { Platform } from 'react-native';
import { escapeHtml } from '@/features/crm/documents';
import {
  reportsApi,
  reportColumns,
  reportCsv,
  reportDefinitions,
  type ReportFilters,
  type ReportKind,
} from './reportsApi';
export async function exportReport(
  kind: ReportKind,
  filters: ReportFilters,
  format: 'pdf' | 'csv',
  signal?: AbortSignal,
) {
  const result = await reportsApi.exportRows(kind, filters, signal);
  const note = `${result.rows.length} sur ${result.total} lignes${result.truncated ? ' — Export limité à 1 000 lignes. Réduisez la période pour exporter la suite.' : ''}`;
  const filename = `rapport-${kind}-${filters.startDate}-${filters.endDate}`;
  if (format === 'csv') {
    const content = reportCsv(kind, result.rows);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename + '.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      const [{ File, Paths }, Sharing] = await Promise.all([
        import('expo-file-system'),
        import('expo-sharing'),
      ]);
      if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage n’est pas disponible.');
      const file = new File(Paths.cache, filename + '.csv');
      file.write(content);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exporter le rapport',
      });
    }
  } else {
    const e = escapeHtml,
      columns = reportColumns(kind);
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{font:11px Arial;color:#172235}h1{font-size:20px;color:#00417c}table{width:100%;border-collapse:collapse}th,td{padding:7px;text-align:left;border-bottom:1px solid #ddd;overflow-wrap:anywhere}th{background:#eff4ff}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>${e(reportDefinitions[kind].title)}</h1><p>Du ${e(filters.startDate)} au ${e(filters.endDate)} · Statut : ${e(filters.status || 'Tous')}</p><p>${e(note)}</p><table><thead><tr>${columns.map(([, label]) => `<th>${e(label)}</th>`).join('')}</tr></thead><tbody>${result.rows.map((row) => `<tr>${columns.map(([key]) => `<td>${e(row[key] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    if (Platform.OS === 'web') {
      const { printCrmDocument } = await import('@/features/crm/documents');
      await printCrmDocument(html);
    } else {
      const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
      if (!(await Sharing.isAvailableAsync())) throw new Error('Le partage n’est pas disponible.');
      const file = await Print.printToFileAsync({ html, width: 841.89, height: 595.28 });
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Rapport PDF',
        UTI: 'com.adobe.pdf',
      });
    }
  }
  return note;
}
