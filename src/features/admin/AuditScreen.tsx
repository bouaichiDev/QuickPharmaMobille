import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AccessGate, CommerceList, SearchFilterRow } from '@/features/commerce/CommerceUI';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { DateInput, date } from '@/features/superadmin/AdminUI';
import { record } from '@/features/crm/crmApi';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { useAdminList } from './useAdminList';
import { auditValues, safeAudit } from './model';
import type { Row } from './api';
import { AdminPage, Panel, AppText, Button, Fold, Notice, design } from './AdminDesign';
export default function AuditScreen() {
  const [action, setAction] = useState(''),
    term = useDebounce(action),
    [dates, setDates] = useState({ date_from: '', date_to: '' }),
    [draft, setDraft] = useState(dates),
    [open, setOpen] = useState(false),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<Row>();
  const query = useAdminList('/audit-logs', { action: term, ...dates }, 'audit.view');
  if (selected) return <AuditDetail row={selected} onBack={() => setSelected(undefined)} />;
  return (
    <AdminPage title="Journaux d’audit" scroll={false}>
      <AccessGate permission="audit.view">
        <Notice>Consultation des événements autorisés du magasin connecté.</Notice>
        <SearchFilterRow
          label="Filtrer par action"
          value={action}
          placeholder="Création, modification…"
          onChangeText={setAction}
          onFilterPress={() => {
            setDraft(dates);
            setOpen(true);
          }}
        />
        <CommerceList
          header={null}
          query={query}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => setSelected(item)}>
              <Panel>
                <AppText variant="labelLg">
                  {String(item.action ?? item.event ?? 'Événement')}
                </AppText>
                <AppText>
                  {[item.firstName, item.lastName].filter(Boolean).join(' ') ||
                    String(record(item.user).email ?? 'Auteur non disponible')}
                </AppText>
                <AppText variant="bodySm">
                  {date(item.created_at)} • {String(item.auditable_type ?? '')}
                </AppText>
              </Panel>
            </Pressable>
          )}
        />
        <SelectionDialog visible={open} title="Période" onClose={() => setOpen(false)}>
          <DateInput
            label="Du"
            value={draft.date_from}
            onChange={(v) => setDraft({ ...draft, date_from: v })}
          />
          <DateInput
            label="Au"
            value={draft.date_to}
            onChange={(v) => setDraft({ ...draft, date_to: v })}
          />
          {error ? <Notice>{error}</Notice> : null}
          <Button
            label="Appliquer"
            onPress={() => {
              if (draft.date_from && draft.date_to && draft.date_from > draft.date_to) {
                setError('La date de début doit précéder la date de fin.');
                return;
              }
              setDates(draft);
              setOpen(false);
            }}
          />
          <Button
            label="Réinitialiser"
            variant="tonal"
            onPress={() => setDraft({ date_from: '', date_to: '' })}
          />
        </SelectionDialog>
      </AccessGate>
    </AdminPage>
  );
}
function AuditDetail({ row, onBack }: { row: Row; onBack: () => void }) {
  const before = auditValues(row.before ?? row.old_values),
    after = auditValues(row.after ?? row.new_values),
    keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].slice(0, 100);
  const value = (v: unknown) =>
    v == null
      ? '—'
      : typeof v === 'object'
        ? JSON.stringify(v).slice(0, 4000)
        : String(v).slice(0, 4000);
  return (
    <AdminPage title="Détail de l’événement" onBack={onBack}>
      <Notice>Consultation uniquement — cet événement ne peut pas être modifié.</Notice>
      <Panel title={String(row.action ?? row.event ?? 'Événement')}>
        <AppText>
          Auteur :{' '}
          {[row.firstName, row.lastName].filter(Boolean).join(' ') ||
            String(record(row.user).email ?? 'Non disponible')}
        </AppText>
        <AppText>Date : {String(row.created_at ?? '—')}</AppText>
        <AppText>
          Cible : {String(row.auditable_type ?? '—')} {String(row.auditable_id ?? '')}
        </AppText>
      </Panel>
      <Panel title="Modifications">
        {keys.length ? (
          keys.map((key) => (
            <View key={key} style={design.stack}>
              <AppText variant="labelLg">{key}</AppText>
              <View style={design.inset}>
                <AppText variant="bodySm">Avant</AppText>
                <AppText selectable>{value(before[key])}</AppText>
              </View>
              <View style={[design.inset, { backgroundColor: '#e5f5ef' }]}>
                <AppText variant="bodySm">Après</AppText>
                <AppText selectable>{value(after[key])}</AppText>
              </View>
            </View>
          ))
        ) : (
          <AppText>Aucun détail de modification disponible.</AppText>
        )}
      </Panel>
      <Fold label="Données techniques">
        <AppText selectable>
          {JSON.stringify(
            safeAudit({
              ip_address: row.ip_address,
              user_agent: row.user_agent,
              details: auditValues(row.details),
            }),
            null,
            2,
          ).slice(0, 12000)}
        </AppText>
      </Fold>
    </AdminPage>
  );
}
