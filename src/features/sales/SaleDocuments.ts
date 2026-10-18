import type { CrmRecord } from '@/features/crm/crmApi';
import { record } from '@/features/crm/crmApi';
import { escapeHtml } from '@/features/crm/documents';
import { money } from './SalesDesign';
import { referenceText, saleDate } from './salesModel';
import { receiptBarcode } from './receiptBarcode';
export interface ReceiptData {
  sale: CrmRecord;
  company: CrmRecord;
  items: CrmRecord[];
}
export function receiptItemTotal(row: CrmRecord) {
  const gross = Number(row.qte ?? 0) * Number(row.price ?? 0);
  const discount =
    row.callDiscount != null ? Number(row.callDiscount) : (gross * Number(row.discount ?? 0)) / 100;
  return Math.round(Math.max(0, gross - discount) * 100) / 100;
}
export function receiptCustomer(sale: CrmRecord) {
  const customer = record(sale.customer);
  return typeof sale.customer === 'string'
    ? sale.customer
    : String(
        customer.name ??
          ([customer.FirstName, customer.LastName].filter(Boolean).join(' ') ||
            [sale.customersName, sale.customersCode].filter(Boolean).join(' ') ||
            'Client comptoir'),
      );
}
export function receiptSummary(data: ReceiptData) {
  const sale = data.sale;
  const total = Number(sale.totalWithTax ?? sale.total ?? 0);
  const discount = Number(sale.calDiscount ?? 0);
  const subtotal = Number(sale.subTotal ?? total);
  const paid = Number(sale.paid ?? 0);
  const received = Number(sale.receivedAmount ?? paid);
  return {
    total,
    discount,
    subtotal,
    paid,
    received,
    tax: Math.max(0, total - (subtotal - discount)),
    due: Math.max(0, Number(sale.due ?? total - paid)),
    change: Math.max(0, received - total),
    method:
      referenceText(
        record(sale.typePayment).code ? record(sale.typePayment) : { code: sale.typePayment },
      ) || 'Non renseigné',
    name: String(data.company.companyName ?? data.company.CompanyName ?? 'QuickPharma'),
    address: String(
      data.company.companyAddress ?? data.company.address ?? data.company.mailAddress ?? '',
    ),
    phone: String(data.company.companyTell ?? data.company.phone ?? data.company.Phone ?? ''),
  };
}
export function receiptText(data: ReceiptData) {
  const t = receiptSummary(data);
  return `${t.name}\n${[t.address, t.phone].filter(Boolean).join('\n')}\nREÇU DE VENTE\nClient : ${receiptCustomer(data.sale)}\nDate : ${saleDate(data.sale.date)}\nRéférence : ${String(data.sale.ref ?? '')}\n${data.items.map((row) => `${String(row.title ?? row.productName ?? row.product_name ?? '')} : ${String(row.qte)} × ${money(row.price)} = ${money(receiptItemTotal(row))} DH`).join('\n')}\nSous-total : ${money(t.subtotal)} DH\nTVA : ${money(t.tax)} DH\nRemise : ${money(t.discount)} DH\nTOTAL : ${money(t.total)} DH\nMode de paiement : ${t.method}\nMontant payé : ${money(t.paid)} DH\n${data.sale.receivedAmount !== undefined ? `Montant reçu : ${money(t.received)} DH\n` : ''}${t.change > 0 ? `Monnaie rendue : ${money(t.change)}` : `Reste dû : ${money(t.due)}`} DH\nMERCI DE VOTRE VISITE !`;
}
/** Same monochrome 80 mm structure as the web ThermalReceipt. */
export function receiptHtml(data: ReceiptData) {
  const e = (v: unknown) => escapeHtml(String(v ?? ''));
  const t = receiptSummary(data);
  const line = (label: string, value: number, strong = false) =>
    `<tr${strong ? ' class="total"' : ''}><td>${e(label)}</td><td>${money(value)}</td></tr>`;
  const bars = receiptBarcode(String(data.sale.ref ?? ''));
  const width = bars.reduce((sum, bar) => sum + bar.width, 0);
  let x = 0;
  const barcode = bars
    .map((bar) => {
      const start = x;
      x += bar.width;
      return bar.isBlack ? `<rect x="${start}" y="0" width="${bar.width}" height="50"/>` : '';
    })
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket ${e(data.sale.ref)}</title><style>
  @page{size:80mm 297mm;margin:0}*{box-sizing:border-box}body{margin:0;color:#000;background:#fff;font:10px 'Courier New',monospace;line-height:1.3}.receipt{width:72mm;max-width:100%;padding:4mm;margin:0 auto}header,footer{text-align:center}h1{font-size:16px;margin:0 0 4px;text-transform:uppercase}h2{font-size:14px;margin:10px 0;text-transform:uppercase}p{margin:4px 0;overflow-wrap:anywhere}.divider{border-top:2px dashed #000;margin:12px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{padding:4px 2px;vertical-align:top;overflow-wrap:anywhere}.items td,.items th{border-bottom:1px dashed #aaa;text-align:left}.items th:nth-child(2),.items td:nth-child(2){text-align:center}.items th:last-child,.items td:last-child,.summary td:last-child{text-align:right}.summary td:first-child{width:60%}.total td{border-top:1px solid #555;font-size:14px;font-weight:bold;padding-top:8px}thead{display:table-header-group}tr{break-inside:avoid}footer{break-inside:avoid}svg{width:100%;max-width:200px;height:50px;shape-rendering:crispEdges}
  </style></head><body><div class="receipt"><header><h1>${e(t.name)}</h1>${t.address ? `<p>${e(t.address)}</p>` : ''}${t.phone ? `<p>${e(t.phone)}</p>` : ''}</header><div class="divider"></div><h2 style="text-align:center">Reçu de vente</h2><div class="divider"></div><p>Client : ${e(receiptCustomer(data.sale))}</p><p>Date : ${e(saleDate(data.sale.date))}</p><p>Référence : ${e(data.sale.ref)}</p><table class="items"><colgroup><col style="width:60%"><col style="width:15%"><col style="width:25%"></colgroup><thead><tr><th>Description</th><th>Qté</th><th>Prix</th></tr></thead><tbody>${data.items.map((row) => `<tr><td>${e(row.title ?? row.productName ?? row.product_name)}</td><td>${e(row.qte)}</td><td>${money(receiptItemTotal(row))}</td></tr>`).join('')}</tbody></table><div class="divider"></div><table class="summary"><tbody>${line('Sous-total', t.subtotal)}${t.tax > 0 ? line('TVA', t.tax) : ''}${t.discount > 0 ? line('Remise', -t.discount) : ''}${line('TOTAL (DH)', t.total, true)}</tbody></table><div class="divider"></div><table class="summary"><tbody><tr><td>Mode de paiement</td><td>${e(t.method)}</td></tr>${line('Montant payé', t.paid)}${data.sale.receivedAmount !== undefined ? line('Montant reçu', t.received) : ''}${t.change > 0 ? line('Monnaie rendue', t.change) : line('Reste dû', t.due)}${data.sale.approvalCode ? `<tr><td>Code d’approbation</td><td>${e(data.sale.approvalCode)}</td></tr>` : ''}</tbody></table><div class="divider"></div><footer><h2>Merci de votre visite !</h2>${barcode ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 50" preserveAspectRatio="none" aria-label="Code-barres">${barcode}</svg><p>${e(data.sale.ref)}</p>` : ''}</footer></div></body></html>`;
}
