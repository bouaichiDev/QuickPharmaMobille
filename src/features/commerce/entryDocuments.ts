import { Platform } from 'react-native';
import { escapeHtml, printCrmDocument } from '@/features/crm/documents';
import { currency } from '@/features/superadmin/AdminUI';
import type { Row } from './api';

// Match the web EntryInvoiceTemplate; inline the logo for native print engines.
export function entryDocumentHtml(entry: Row, items: Row[], company: Row, logo?: string) {
  const e = escapeHtml;
  const formatDate = (value: unknown) => {
    const parsed = new Date(String(value ?? ''));
    return Number.isNaN(parsed.getTime())
      ? String(value ?? '')
      : new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(
          parsed,
        );
  };
  const amount = (value: unknown) => e(currency(value));
  const summary = (label: string, value: unknown, strong = false, due = false) =>
    `<tr${strong ? ' class="strong"' : ''}><td>${e(label)}</td><td${due && Number(value) > 0 ? ' class="debt"' : ''}>${amount(value)}</td></tr>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bon d’entrée ${e(entry.ref)}</title><style>
@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;font:14px Arial,sans-serif;color:#333;background:white}.document{position:relative;padding:20px;max-width:800px;margin:0 auto;min-height:1000px;padding-bottom:120px}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #eee;padding-bottom:15px;margin-bottom:20px}h1{font-size:22px;margin:0 0 5px;font-weight:bold}.muted{color:#666}.logo{width:120px;height:60px;display:flex;align-items:center;justify-content:center;color:#666;font-weight:bold}.logo img{max-width:100%;max-height:100%;object-fit:contain}.info{display:flex;justify-content:space-between;margin-bottom:20px}.info>div{width:48%}h3{font-size:14px;color:#666;margin:0 0 10px}p{margin:0 0 5px;overflow-wrap:anywhere;white-space:pre-wrap}.items-title{font-size:16px;color:#333;margin-bottom:15px}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid;border-bottom:1px solid #eee}th{padding:10px 5px;text-align:left;color:#666;font-weight:normal}td{padding:15px 5px;overflow-wrap:anywhere}.items{margin-bottom:30px;table-layout:fixed}.items th:nth-child(1){width:32%}.items th:nth-child(2){width:23%}.items th:nth-child(3){width:10%}.items th:nth-child(4),.items th:nth-child(5){width:17.5%}.items td:nth-child(2){color:#666}.items th:nth-child(3),.items td:nth-child(3){text-align:center}.items th:nth-child(n+4),.items td:nth-child(n+4){text-align:right}.summary{width:48%;margin-left:auto;margin-bottom:30px;break-inside:avoid}.summary td{padding:10px 5px;color:#666}.summary td:last-child{text-align:right}.summary .strong td{font-weight:bold;color:#333}.summary .debt{color:#ef4444!important}.summary tr:last-child{border:0}footer{position:absolute;bottom:20px;left:0;right:0;text-align:center;border-top:1px solid #eee;padding-top:20px;font-size:14px}
</style></head><body><main class="document"><header><div><h1>ENTRÉE DE STOCK #${e(entry.ref)}</h1><div class="muted">Date : ${e(formatDate(entry.date))}</div></div><div class="logo">${logo && /^data:image\/(png|jpeg|webp);base64,/.test(logo) ? `<img src="${e(logo)}" alt="Logo du magasin">` : e(company.companyName ?? 'QuickPharma')}</div></header>
<section class="info"><div><h3>Fournisseur</h3><p><strong>${e(entry.providersName ?? entry.provider ?? 'Fournisseur')}</strong></p>${entry.providersEmail ? `<p class="muted">${e(entry.providersEmail)}</p>` : ''}${entry.providersTell ? `<p class="muted">${e(entry.providersTell)}</p>` : ''}</div><div><h3>Informations</h3><p>Statut : ${e(entry.entreeStatusLabel ?? entry.entreeStatusCode ?? '')}</p><p class="muted">Date : ${e(formatDate(entry.date))}</p>${entry.note ? `<p class="muted">Note : ${e(entry.note)}</p>` : ''}</div></section>
<h3 class="items-title">Articles</h3><table class="items"><thead><tr><th>Produit</th><th>SKU</th><th>Quantité</th><th>Prix</th><th>Total</th></tr></thead><tbody>${items
    .map((r) => {
      const quantity = r.qte ?? r.quantity ?? 0;
      const price = r.Price ?? r.price ?? 0;
      return `<tr><td>${e(r.title ?? r.productName ?? '')}</td><td>${e(r.ref ?? r.sku ?? '-')}</td><td>${e(quantity)}</td><td>${amount(price)}</td><td>${amount(r.total ?? Number(price) * Number(quantity))}</td></tr>`;
    })
    .join('')}</tbody></table>
<table class="summary"><tbody>${summary('Sous-total', entry.subTotal)}${summary('Taxe', entry.tax)}${Number(entry.discount) > 0 ? summary('Remise', -Number(entry.discount)) : ''}${summary('Total', entry.totalWithTax ?? entry.total, true)}${summary('Payé', entry.paid)}${summary('Reste dû', Math.abs(Number(entry.due ?? 0)), true, true)}</tbody></table>
<footer><p><strong>${e(company.companyName ?? '')}</strong></p><p class="muted">${e(company.companyAddress ?? '')}</p><p class="muted">${e(company.companyEmail ?? '')} | ${e(company.companyTell ?? '')}</p></footer></main></body></html>`;
}
export async function exportEntryDocument(html: string, print = false, entry?: Row) {
  if (!print && Platform.OS === 'web') {
    throw new Error('Pour joindre le PDF directement à un e-mail, utilisez l’application mobile.');
  }
  if (print) {
    await printCrmDocument(html);
    return;
  }
  const [Print, Mail] = await Promise.all([import('expo-print'), import('./entryMail')]);
  await Mail.ensureEntryMailAvailable();
  const result = await Print.printToFileAsync({ html, width: 595.28, height: 841.89 });
  await Mail.composeEntryMail(result.uri, entry);
  // Android resolves when the mail intent opens, before the client reads the file.
  // Keep the PDF in the OS-managed cache so the attachment stays available.
}
