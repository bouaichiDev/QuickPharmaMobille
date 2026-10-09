import { customDefault } from './dynamicFields';
import { CrmDynamicField } from './components/CrmDynamicField';
import { CrmSessionCounter } from './components/CrmChoiceControls';
import { CrmFormHeading } from './components/StitchChrome';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { CrmPage, CrmSection, crmStyles } from './components/CrmDesign';
import { CrmFormFields } from './components/CrmFormFields';
import { ClientPhotos } from './ClientPhotos';
import {
  DraftSessionPhotos,
  uploadSessionPhoto,
  type DraftPhoto,
} from './components/DraftSessionPhotos';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAccess } from '@/features/access/useAccess';
import { useTranslation } from '@/i18n/useTranslation';
import { errorMessage } from '@/utils/errorMessage';
import { can, canCreate, type CrmModule } from './modules';
import { crmApi, itemId, record, listPayload, unwrap, type CrmRecord } from './crmApi';
import { apiGet } from '@/services/api/client';
import { useSessionStore } from '@/features/auth/sessionStore';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formPayload, moduleFields, type CrmField } from './fields';
import { ReferencePicker } from './ReferencePicker';
import {
  changeSessionIdentity,
  remainingPackageServices,
  normalizeSessionAmounts,
} from './sessionForm';

export function CrmForm({
  module,
  row,
  payment,
  extra,
  initialValues,
  onClose,
  onSaved,
}: {
  module: CrmModule;
  row?: CrmRecord;
  payment?: boolean;
  extra?: CrmRecord;
  initialValues?: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const access = useAccess();
  const translator = useTranslation();
  const cache = useQueryClient();
  const idempotency = useRef<string | null>(null);
  const savedSession = useRef<CrmRecord | null>(null);
  const uploadedPhotos = useRef(0);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const fields = (
    row && module.key === 'packages' && !payment
      ? ([
          {
            key: 'sessions_total',
            label: 'Nombre total de séances',
            numeric: true,
            integer: true,
            required: true,
          },
        ] as CrmField[])
      : (moduleFields[payment ? 'payment' : module.key] ?? [])
  ).filter(
    (field) =>
      (!field.permission || can(access.data, field.permission)) &&
      !(
        row &&
        module.key === 'services' &&
        field.key === 'default_price' &&
        !can(access.data, 'services.catalog.update_prices')
      ) &&
      !(
        row &&
        module.key === 'packages' &&
        ['customer_id', 'service_package_id', 'expiration_date'].includes(field.key)
      ) &&
      !(module.key === 'service-packages' && ['service_id', 'sessions_count'].includes(field.key)),
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        payment
          ? ''
          : Array.isArray(row?.[field.key])
            ? (row?.[field.key] as string[]).join('\n')
            : String(
                row?.[field.key] ??
                  initialValues?.[field.key] ??
                  (['recommended_sessions', 'visible', 'Active', 'active'].includes(field.key)
                    ? '1'
                    : field.key === 'session_date'
                      ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : (field.choices?.[0] ?? '')),
              ),
      ]),
    ),
  );
  const [validation, setValidation] = useState('');
  const [estimatedBirth, setEstimatedBirth] = useState(!!row?.birth_date_estimated);
  function changeValue(key: string, value: string) {
    if (key === 'age') {
      if (!value) {
        setValues((old) => ({ ...old, date_of_birth: '' }));
        setEstimatedBirth(false);
        return;
      }
      const age = Number(value);
      if (!Number.isInteger(age) || age < 0 || age > 125) return;
      const date = new Date();
      date.setFullYear(date.getFullYear() - age);
      const birth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      setValues((old) => ({ ...old, date_of_birth: birth }));
      setEstimatedBirth(true);
      return;
    }
    if (key === 'date_of_birth') setEstimatedBirth(false);
    if (['service_id', 'customer_id', 'customer_service_package_id'].includes(key))
      setCustomValues({});
    if (module.key === 'sessions' && !payment) {
      setValues((old) => changeSessionIdentity(old, key, value));
      return;
    }
    setValues((old) => ({
      ...old,
      [key]: value,
      ...(key === 'customer_id' ? { customer_service_package_id: '' } : {}),
    }));
  }
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const [customValues, setCustomValues] = useState<CrmRecord>(() => ({
    ...record(row?.values_by_field_id),
  }));
  const [prescription, setPrescription] = useState<CrmRecord[]>(() =>
    Array.isArray(row?.prescription) ? row.prescription.map(record) : [],
  );
  const [composition, setComposition] = useState<CrmRecord[]>(() =>
    Array.isArray(row?.service_items)
      ? row.service_items.map(record)
      : [{ service_id: '', sessions_count: 1 }],
  );
  const customFields = useQuery({
    queryKey: ['crm', store, 'fields', values.service_id],
    enabled: module.key === 'sessions' && !payment && !!values.service_id,
    queryFn: async () =>
      listPayload(
        await apiGet(`/services/${encodeURIComponent(values.service_id!)}/fields`, {
          params: { per_page: 500 },
        }),
      ).rows,
  });
  const allowed = payment
    ? can(access.data, 'services.payments.collect')
    : row
      ? can(access.data, module.update)
      : canCreate(access.data, module);
  const mutation = useMutation({
    mutationFn: async () => {
      idempotency.current ??= `mobile-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!allowed && !savedSession.current) throw new Error('Accès refusé.');
      const payload = { ...extra, ...formPayload(fields, values) };
      if (module.key === 'service-packages') {
        if (
          !composition.length ||
          composition.some(
            (item) =>
              !item.service_id ||
              !Number.isInteger(Number(item.sessions_count)) ||
              Number(item.sessions_count) < 1,
          )
        )
          throw new Error(
            'Choisissez un service et au moins une séance pour chaque ligne du forfait.',
          );
        if (new Set(composition.map((item) => item.service_id)).size !== composition.length)
          throw new Error('Chaque service doit apparaître une seule fois.');
        payload.service_items = composition.map((item) => ({
          service_id: item.service_id,
          sessions_count: Number(item.sessions_count),
        }));
      }
      if (module.key === 'form-builder') payload.sort_order = Number(payload.sort_order ?? 0);
      if (module.key === 'sessions' && !payment) {
        normalizeSessionAmounts(payload);
        const custom = (customFields.data ?? []).filter(
          (field) => field.visible !== false && field.visible !== 0,
        );
        for (const field of custom)
          if (field.required && !String(customDefault(field, customValues[itemId(field)])).trim())
            throw new Error(`${String(field.label ?? field.name)} : champ obligatoire.`);
        if (values.service_id)
          payload.values = Object.entries({
            ...customValues,
            ...Object.fromEntries(
              custom.map((field) => [
                itemId(field),
                customDefault(field, customValues[itemId(field)]),
              ]),
            ),
          }).map(([id, value]) => ({ service_field_id: id, value }));
        payload.prescription = prescription.filter((line) => String(line.name ?? '').trim());
      }
      if (module.key === 'services' && row && !can(access.data, 'services.catalog.update_prices'))
        delete payload.default_price;
      if (module.key === 'clients') {
        payload.birth_date_estimated = estimatedBirth;
        payload.Active = Number(values.Active ?? row?.Active ?? 1);
        if (row)
          for (const key of [
            'Cnss',
            'CreditCeiling',
            'DefaultDiscount',
            'OrgCode',
            'OrgRegistrationNumber',
            'OrgRegistration',
          ])
            payload[key] = row[key] ?? null;
      }
      if (payment) return crmApi.action(module, itemId(row!), 'payments', payload);
      // Send only changed fields on update, preserving restricted and complex values.
      if (row && module.key !== 'clients')
        for (const field of fields) {
          if (
            JSON.stringify(payload[field.key]) === JSON.stringify(row[field.key]) ||
            String(payload[field.key] ?? '') === String(row[field.key] ?? '')
          )
            delete payload[field.key];
        }
      const saved =
        savedSession.current ??
        (await crmApi.save(
          module,
          payload,
          row ? itemId(row) : undefined,
          !row && module.key === 'sessions' ? idempotency.current : undefined,
        ));
      if (!row && module.key === 'sessions' && photos.length) {
        savedSession.current = record(saved);
        setHasSavedSession(true);
        const sessionId = itemId(savedSession.current);
        if (!sessionId)
          throw new Error(
            'Séance enregistrée, mais sa référence est indisponible pour les photos.',
          );
        for (let index = uploadedPhotos.current; index < photos.length; index++) {
          await uploadSessionPhoto(photos[index]!, {
            clientId: values.customer_id!,
            serviceId: values.service_id!,
            sessionId,
            packageId: values.customer_service_package_id || undefined,
          });
          uploadedPhotos.current = index + 1;
        }
      }
      return saved;
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['crm'] }),
        cache.invalidateQueries({ queryKey: ['dashboard'] }),
        cache.invalidateQueries({ queryKey: ['access'] }),
      ]);
      onSaved();
    },
    onError: (error) => {
      if (error instanceof Error && error.constructor === Error) setValidation(error.message);
    },
  });
  const save = () => {
    try {
      formPayload(fields, values);
      if (
        module.key === 'clients' &&
        values.date_of_birth &&
        new Date(values.date_of_birth) > new Date()
      )
        throw new Error('La date de naissance ne peut pas être dans le futur.');
      if (
        row &&
        module.key === 'packages' &&
        Number(values.sessions_total) < Number(row.sessions_used ?? 0)
      )
        throw new Error('Le total ne peut pas être inférieur aux séances déjà utilisées.');
      if (module.key === 'sessions' && photos.length && (!values.customer_id || !values.service_id))
        throw new Error('Choisissez le client et le service avant d’ajouter les photos.');
      if (module.key === 'services' && values.color && !/^#[0-9a-f]{6}$/i.test(values.color))
        throw new Error('La couleur doit être un code Hex, par exemple #1CB5A9.');
      setValidation('');
      mutation.mutate();
    } catch (error) {
      setValidation(error instanceof Error ? error.message : 'Valeur invalide.');
    }
  };
  const formTitle = payment
    ? 'Enregistrer un règlement'
    : `${row ? 'Modifier' : module.key === 'sessions' ? 'Nouvelle' : 'Nouveau'} ${({ clients: 'client', services: 'service', sessions: 'séance', appointments: 'rendez-vous', packages: 'forfait client', 'service-packages': 'forfait', 'form-builder': 'champ supplémentaire' } as Record<string, string>)[module.key] ?? module.label}`;
  return (
    <CrmPage
      visible
      onClose={mutation.isPending ? () => undefined : onClose}
      title={formTitle}
      footer={
        <>
          <Button
            label="Annuler"
            variant="tonal"
            disabled={mutation.isPending}
            onPress={onClose}
            style={{ flex: 0.7 }}
          />
          <Button
            label={
              hasSavedSession
                ? 'Réessayer les photos'
                : row || payment
                  ? 'Enregistrer'
                  : module.key === 'clients'
                    ? 'Créer le client'
                    : module.key === 'services'
                      ? 'Créer le service'
                      : 'Enregistrer'
            }
            loading={mutation.isPending}
            disabled={
              (!allowed && !hasSavedSession) || customFields.isFetching || customFields.isError
            }
            onPress={save}
            icon="save"
            style={{ flex: 1.4 }}
          />
        </>
      }
    >
      <CrmFormHeading title={formTitle} moduleKey={module.key} editing={!!row} />
      {hasSavedSession ? (
        <AppText color="secondary">
          La séance est enregistrée. Réessayez pour terminer le transfert des photos, sans créer de
          doublon.
        </AppText>
      ) : null}
      <View pointerEvents={hasSavedSession ? 'none' : 'auto'}>
        <CrmFormFields
          moduleKey={payment ? 'payment' : module.key}
          fields={fields}
          values={values}
          estimatedBirth={estimatedBirth}
          showMoney={
            !!payment ||
            can(access.data, 'services.payments.view') ||
            ['services', 'service-packages'].includes(module.key)
          }
          onChange={changeValue}
          onSelect={(key, selected) => {
            if (key === 'service_id')
              setValues((old) => ({
                ...old,
                duration_minutes: String(selected.duration_minutes ?? 60),
                price: String(selected.default_price ?? 0),
              }));
            if (key === 'customer_service_package_id') {
              const serviceId = String(remainingPackageServices(selected)[0]?.service_id ?? '');
              const packageId = itemId(selected);
              setValues((old) => ({
                ...old,
                service_id: serviceId,
                price: String(
                  Number(selected.price_paid ?? 0) / Math.max(1, Number(selected.sessions_total)),
                ),
                duration_minutes: '60',
              }));
              if (serviceId)
                void apiGet(`/services/${encodeURIComponent(serviceId)}`)
                  .then((response) => {
                    const service = record(unwrap(response));
                    setValues((old) =>
                      old.customer_service_package_id === packageId
                        ? { ...old, duration_minutes: String(service.duration_minutes ?? 60) }
                        : old,
                    );
                  })
                  .catch(() => undefined);
            }
            if (
              key === 'service_package_id' &&
              module.key === 'packages' &&
              selected.price !== undefined
            )
              setValues((old) => ({ ...old, price_paid: String(selected.price) }));
          }}
        />
      </View>
      {validation || mutation.isError ? (
        <AppText color="error" accessibilityLiveRegion="polite">
          {validation || errorMessage(mutation.error, translator)}
        </AppText>
      ) : null}
      {module.key === 'sessions' && !payment ? (
        <View style={{ gap: 16 }} pointerEvents={hasSavedSession ? 'none' : 'auto'}>
          <CrmSection title="6. Prescription" icon="receipt-long">
            {prescription.map((line, index) => (
              <View key={index} style={crmStyles.inset}>
                {(['name', 'dosage', 'frequency', 'duration', 'instructions'] as const).map(
                  (key) => (
                    <TextField
                      appearance="crm"
                      key={key}
                      label={
                        {
                          name: 'Médicament',
                          dosage: 'Dosage',
                          frequency: 'Fréquence',
                          duration: 'Durée',
                          instructions: 'Instructions',
                        }[key]
                      }
                      value={String(line[key] ?? '')}
                      onChangeText={(value) =>
                        setPrescription((old) =>
                          old.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)),
                        )
                      }
                    />
                  ),
                )}
                <Button
                  label="Retirer ce médicament"
                  variant="dangerSoft"
                  onPress={() => setPrescription((old) => old.filter((_, i) => i !== index))}
                />
              </View>
            ))}
            <Button
              label="Ajouter un médicament"
              variant="tonal"
              onPress={() =>
                setPrescription((old) => [
                  ...old,
                  { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
                ])
              }
            />
          </CrmSection>
          <CrmSection title="7. Diagnostic du soin" icon="tune">
            {customFields.isError ? (
              <ErrorState error={customFields.error} onRetry={() => void customFields.refetch()} />
            ) : (
              (customFields.data ?? [])
                .filter((field) => field.visible !== false && field.visible !== 0)
                .map((field) => {
                  const id = itemId(field);
                  return (
                    <CrmDynamicField
                      key={id}
                      field={field}
                      value={customValues[id]}
                      onChange={(value) => setCustomValues((old) => ({ ...old, [id]: value }))}
                    />
                  );
                })
            )}
          </CrmSection>
          {can(access.data, 'services.documents.manage') ||
          (row && can(access.data, 'services.documents.view')) ? (
            <CrmSection title="8. Photos Avant / Après" icon="photo-camera">
              {row?.customer_id ? (
                <ClientPhotos
                  clientId={String(row.customer_id)}
                  serviceId={String(values.service_id ?? '')}
                  packageId={String(values.customer_service_package_id || '') || undefined}
                  sessionId={itemId(row)}
                />
              ) : (
                <View pointerEvents={hasSavedSession ? 'none' : 'auto'}>
                  <DraftSessionPhotos value={photos} onChange={setPhotos} />
                </View>
              )}
            </CrmSection>
          ) : null}
        </View>
      ) : null}
      {module.key === 'service-packages' ? (
        <CrmSection title="3. Composition du forfait" icon="inventory-2">
          {composition.map((item, index) => (
            <View key={index} style={crmStyles.inset}>
              <ReferencePicker
                field={{
                  key: 'service_id',
                  label: 'Service',
                  required: true,
                  reference: '/services',
                }}
                value={String(item.service_id ?? '')}
                onChange={(value) =>
                  setComposition((old) =>
                    old.map((line, i) => (i === index ? { ...line, service_id: value } : line)),
                  )
                }
              />
              <CrmSessionCounter
                label="Nombre de séances"
                value={String(item.sessions_count ?? 1)}
                onChange={(value) =>
                  setComposition((old) =>
                    old.map((line, i) => (i === index ? { ...line, sessions_count: value } : line)),
                  )
                }
              />
              <Button
                label="Retirer le service"
                variant="dangerSoft"
                onPress={() => setComposition((old) => old.filter((_, i) => i !== index))}
              />
            </View>
          ))}
          <Button
            label="Ajouter un service au forfait"
            variant="tonal"
            onPress={() => setComposition((old) => [...old, { service_id: '', sessions_count: 1 }])}
          />
        </CrmSection>
      ) : null}
      {!allowed ? (
        <AppText color="error">
          Création indisponible : vérifiez les droits et les quotas de votre abonnement.
        </AppText>
      ) : null}
    </CrmPage>
  );
}
