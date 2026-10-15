import { Platform } from 'react-native';
import { itemName, record, type CrmRecord } from './crmApi';
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}
export function clientDocument(customer: CrmRecord, sessions: CrmRecord[]) {
  const html = (value: unknown) => escapeHtml(value);
  const visits = sessions
    .map(
      (session) => `<section class="visit">
    <h3>${html(itemName(record(session.service)) || 'Séance')}</h3>
    <p class="meta">${html(session.session_date)} · ${html(session.duration_minutes)} minutes</p>
    ${itemName(record(session.employee)) ? `<p>Intervenant : ${html(itemName(record(session.employee)))}</p>` : ''}
    ${session.observation ? `<div class="note">${html(session.observation)}</div>` : ''}
    ${Array.isArray(session.treatment_zones) && session.treatment_zones.length ? `<p>Zones : ${html(session.treatment_zones.join(', '))}</p>` : ''}
  </section>`,
    )
    .join('');
  const medicines = sessions.flatMap((session) =>
    Array.isArray(session.prescription) ? session.prescription.map(record) : [],
  );
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dossier client</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#14213b;margin:0;font-size:11pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    header{background:#eff4ff;border-radius:12px;padding:18px;margin-bottom:22px}header strong{font-size:18pt;color:#00417c}.eyebrow{font-size:9pt;letter-spacing:.8px;color:#00776c}h1{font-size:20pt;margin:8px 0}h2{font-size:15pt;color:#00417c;margin:22px 0 12px;break-after:avoid}h3{font-size:12pt;color:#00417c;margin:0 0 8px}.profile,.visit{background:#f1f5ff;border-radius:12px;padding:16px;margin:10px 0 14px;break-inside:avoid}.meta{color:#00776c;font-size:10pt}p{margin:6px 0;white-space:pre-wrap}.note{background:white;border-radius:8px;padding:12px;margin-top:10px;white-space:pre-wrap}.conditions{color:#7d4231;background:#fff0e9;border-radius:8px;padding:10px}.medicine{background:#f1f5ff;border-radius:10px;padding:14px;margin:10px 0;break-inside:avoid}
    </style></head><body><header><strong>QuickPharma</strong><p class="eyebrow">DOSSIER CLIENT · SERVICES CRM</p></header>
    <h2>Profil &amp; antécédents</h2><section class="profile"><h1>${html(itemName(customer))}</h1>
    <p>${[customer.Phone, customer.Email].filter(Boolean).map(html).join(' · ')}</p>
    <p>Naissance : ${html(customer.date_of_birth || 'Non renseignée')} · CIN : ${html(customer.Cin || 'Non renseigné')}</p>
    <p><strong>Antécédents médicaux</strong></p><div class="conditions">${html(Array.isArray(customer.medical_conditions) && customer.medical_conditions.length ? customer.medical_conditions.join(', ') : 'Aucun antécédent renseigné')}</div></section>
    <h2>Historique des prestations</h2><p class="meta">${sessions.length} séance${sessions.length > 1 ? 's' : ''}</p>${visits || '<p>Aucune séance à imprimer.</p>'}
    ${medicines.length ? `<h2>Prescriptions associées</h2>${medicines.map((line) => `<section class="medicine"><h3>${html(line.name)}</h3><p>${[line.dosage, line.frequency, line.duration].filter(Boolean).map(html).join(' · ')}</p>${line.instructions ? `<p>${html(line.instructions)}</p>` : ''}</section>`).join('')}` : ''}</body></html>`;
}
export async function printCrmDocument(html: string) {
  if (Platform.OS === 'web') {
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.title = 'Dossier à imprimer';
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
    frame.srcdoc = html;
    // Leave enough time for the browser's print dialog; no patient data is persisted.
    setTimeout(() => frame.remove(), 60000);
    return;
  }
  const Print = await import('expo-print');
  await Print.printAsync({ html });
}
