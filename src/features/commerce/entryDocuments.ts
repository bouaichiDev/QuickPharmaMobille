import { Platform } from 'react-native';
import { escapeHtml, printCrmDocument } from '@/features/crm/documents';
import { currency, date } from '@/features/superadmin/AdminUI';
import type { Row } from './api';
export function entryDocumentHtml(entry: Row, items: Row[], company: Row) {
  const e = escapeHtml;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Bon d’entrée ${e(entry.ref)}</title><style>@page{size:A4;margin:15mm}body{font:12px Arial;color:#172235}header{border-bottom:2px solid #004a80;padding-bottom:16px}h1{color:#004a80;font-size:24px}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{padding:10px;border-bottom:1px solid #dce3eb;text-align:left}th{background:#eff4ff}td:last-child,th:last-child{text-align:right}.summary{width:50%;margin-left:auto}p{white-space:pre-wrap}tr{break-inside:avoid}</style></head><body><header><h2>${e(company.companyName ?? 'QuickPharma')}</h2><p>${e(company.companyAddress ?? '')}<br>${e(company.companyTell ?? '')}</p></header><h1>BON D’ENTRÉE DE STOCK</h1><p>Référence : ${e(entry.ref)}<br>Date : ${e(date(entry.date))}<br>Fournisseur : ${e(entry.providersName ?? entry.provider ?? '')}<br>Statut : ${e(entry.entreeStatusLabel ?? '')}</p><table><thead><tr><th>Produit / Code</th><th>Quantité</th><th>Prix unitaire</th><th>Expiration</th><th>Total</th></tr></thead><tbody>${items.map((r) => `<tr><td>${e(r.title)}<br>${e(r.ref)}</td><td>${e(r.qte)}</td><td>${e(currency(r.price))}</td><td>${e(r.dateExperation ? date(r.dateExperation) : '—')}</td><td>${e(currency(Number(r.qte) * Number(r.price)))}</td></tr>`).join('')}</tbody></table><table class="summary">${[
    ['Sous-total', entry.subTotal],
    ['Remise', entry.calDiscount ?? entry.discount],
    ['Total TTC', entry.totalWithTax ?? entry.total],
    ['Montant payé', entry.paid],
    ['Reste dû', entry.due],
  ]
    .map(([label, v]) => `<tr><td>${e(label)}</td><td>${e(currency(v))}</td></tr>`)
    .join(
      '',
    )}</table><p>Taxe : ${e(entry.tax ?? 0)} %</p>${entry.note ? `<p>${e(entry.note)}</p>` : ''}</body></html>`;
}
export async function exportEntryDocument(html: string, print = false) {
  if (print || Platform.OS === 'web') {
    await printCrmDocument(html);
    return;
  }
  const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Le partage de documents n’est pas disponible.');
  const result = await Print.printToFileAsync({ html });
  try {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Bon d’entrée de stock',
      UTI: 'com.adobe.pdf',
    });
  } finally {
    const { File } = await import('expo-file-system');
    const file = new File(result.uri);
    if (file.exists) file.delete();
  }
}
