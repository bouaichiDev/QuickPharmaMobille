import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { formatDateTime } from '@/utils/format';
import { errorMessage } from '@/utils/errorMessage';
import { itemName, record, type CrmRecord } from '../crmApi';
import { escapeHtml, printCrmDocument } from '../documents';
import { CrmPage, CrmSection, crmStyles } from './CrmDesign';

export function CrmPrescription({
  customer,
  session,
}: {
  customer: CrmRecord;
  session: CrmRecord;
}) {
  const [visible, setVisible] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const translator = useTranslation();
  const { locale } = translator;
  const lines = Array.isArray(session.prescription) ? session.prescription.map(record) : [];
  const service = itemName(record(session.service)) || 'Séance de soins';
  const date = session.session_date ? formatDateTime(String(session.session_date), locale) : '';
  const clinician = itemName(record(session.employee));
  async function print() {
    setPrinting(true);
    setError('');
    const html = escapeHtml;
    try {
      await printCrmDocument(
        `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Ordonnance</title><style>@page{size:A4;margin:20mm}body{font:14px Arial;color:#102033}h1{color:#00417c}section{padding:16px;background:#eff4ff;margin:12px 0;border-radius:10px;break-inside:avoid}p{white-space:pre-wrap}</style><h1>Ordonnance</h1><h2>${html(itemName(customer))}</h2><p>${html(service)} · ${html(date)}</p>${clinician ? `<p>Praticien : ${html(clinician)}</p>` : ''}${lines.map((line) => `<section><h3>${html(line.name)}</h3><p>${[line.dosage, line.frequency, line.duration].filter(Boolean).map(html).join(' · ')}</p><p>${html(line.instructions)}</p></section>`).join('')}</html>`,
      );
    } catch (cause) {
      setError(errorMessage(cause, translator));
    } finally {
      setPrinting(false);
    }
  }
  if (!lines.length) return null;
  return (
    <>
      <View style={{ gap: 8 }}>
        <AppText variant="labelLg">Ordonnance · {service}</AppText>
        <AppText variant="bodySm" color="outline">
          {date} · {lines.length} ligne{lines.length > 1 ? 's' : ''}
        </AppText>
        <Button
          label="Voir l’ordonnance"
          icon="receipt-long"
          variant="tonal"
          onPress={() => setVisible(true)}
        />
      </View>
      <CrmPage
        visible={visible}
        title="Ordonnance"
        onClose={() => setVisible(false)}
        footer={
          <>
            <Button
              label="Fermer"
              variant="tonal"
              onPress={() => setVisible(false)}
              style={{ flex: 1 }}
            />
            <Button
              label="Imprimer"
              icon="print"
              loading={printing}
              onPress={() => void print()}
              style={{ flex: 1 }}
            />
          </>
        }
      >
        <View style={crmStyles.card}>
          <AppText variant="headlineMd">{itemName(customer)}</AppText>
          <AppText color="secondary">{service}</AppText>
          <AppText variant="bodySm" color="outline">
            {date}
          </AppText>
          {clinician ? <AppText>Praticien : {clinician}</AppText> : null}
        </View>
        {lines.map((line, index) => (
          <CrmSection key={index} title={String(line.name)} icon="medication">
            {[
              ['Posologie', line.dosage],
              ['Fréquence', line.frequency],
              ['Durée', line.duration],
              ['Instructions', line.instructions],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <View key={String(label)} style={{ gap: 4 }}>
                  <AppText variant="labelSm" color="outline">
                    {String(label)}
                  </AppText>
                  <AppText>{String(value)}</AppText>
                </View>
              ))}
          </CrmSection>
        ))}
        {error ? <AppText color="error">{error}</AppText> : null}
      </CrmPage>
    </>
  );
}
