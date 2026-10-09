export interface CrmField {
  key: string;
  label: string;
  required?: boolean;
  numeric?: boolean;
  integer?: boolean;
  date?: boolean;
  reference?: string;
  permission?: string;
  multiline?: boolean;
  array?: boolean;
  choices?: string[];
  json?: boolean;
}
const customer: CrmField = {
  key: 'customer_id',
  label: 'Client',
  required: true,
  reference: '/customerDropdown',
  integer: true,
};
const service: CrmField = {
  key: 'service_id',
  label: 'Service',
  required: true,
  reference: '/services',
};
const price: CrmField = { key: 'price', label: 'Prix', required: true, numeric: true };
const paid: CrmField = {
  key: 'amount_paid',
  label: 'Montant encaissé',
  numeric: true,
  permission: 'services.payments.collect',
};
export const moduleFields: Record<string, CrmField[]> = {
  'form-builder': [
    { key: 'name', label: 'Nom du champ', required: true },
    { key: 'label', label: 'Libellé' },
    {
      key: 'type',
      label: 'Type',
      required: true,
      choices: [
        'text',
        'textarea',
        'number',
        'decimal',
        'checkbox',
        'radio',
        'select',
        'multiselect',
        'date',
        'datetime',
        'email',
        'phone',
        'color',
        'url',
        'json',
      ],
    },
    { key: 'required', label: 'Obligatoire', choices: ['0', '1'], numeric: true },
    { key: 'visible', label: 'Visible', choices: ['0', '1'], numeric: true },
    { key: 'sort_order', label: 'Ordre', numeric: true, integer: true },
    { key: 'placeholder', label: 'Texte indicatif' },
    { key: 'default_value', label: 'Valeur par défaut' },
    { key: 'options', label: 'Options (une par ligne)', multiline: true, array: true },
  ],
  'care-catalogs': [{ key: 'label', label: 'Libellé', required: true }],
  clients: [
    { key: 'FirstName', label: 'Prénom', required: true },
    { key: 'LastName', label: 'Nom' },
    { key: 'Email', label: 'E-mail', required: true },
    { key: 'Phone', label: 'Téléphone' },
    { key: 'Cin', label: 'CIN (Carte Nationale)' },
    { key: 'Active', label: 'Client actif', choices: ['0', '1'], numeric: true },
    { key: 'date_of_birth', label: 'Date de naissance', date: true },
    {
      key: 'medical_conditions',
      label: 'Maladies et antécédents médicaux',
      array: true,
      multiline: true,
    },
  ],
  services: [
    { key: 'name', label: 'Nom', required: true },
    { key: 'description', label: 'Description et protocole', multiline: true },
    { key: 'color', label: 'Couleur du service' },
    { key: 'active', label: 'Service actif', choices: ['0', '1'], numeric: true },
    { key: 'default_price', label: 'Prix', required: true, numeric: true },
    {
      key: 'duration_minutes',
      label: 'Durée (minutes)',
      required: true,
      numeric: true,
      integer: true,
    },
    {
      key: 'recommended_sessions',
      label: 'Nombre de séances recommandé',
      required: true,
      numeric: true,
      integer: true,
    },
  ],
  'service-packages': [
    { key: 'name', label: 'Nom', required: true },
    service,
    {
      key: 'sessions_count',
      label: 'Nombre de séances',
      required: true,
      numeric: true,
      integer: true,
    },
    price,
    { key: 'description', label: 'Description', multiline: true },
  ],
  packages: [
    customer,
    { key: 'service_package_id', label: 'Forfait', required: true, reference: '/service-packages' },
    { key: 'price_paid', label: 'Prix de vente', numeric: true },
    paid,
    { key: 'expiration_date', label: 'Date d’expiration', date: true },
  ],
  sessions: [
    customer,
    service,
    { key: 'session_date', label: 'Date et heure', required: true, date: true },
    price,
    {
      key: 'status_id',
      label: 'Statut',
      reference: '/statusliste/service_sessions',
      integer: true,
    },
    {
      key: 'duration_minutes',
      label: 'Durée prévue (minutes)',
      required: true,
      numeric: true,
      integer: true,
    },
    {
      key: 'employee_id',
      label: 'Intervenant',
      reference: '/usersListe',
      integer: true,
      permission: 'services.sessions.assign',
    },
    {
      key: 'discount',
      label: 'Remise',
      numeric: true,
      permission: 'services.sessions.apply_discount',
    },
    paid,
    {
      key: 'customer_service_package_id',
      label: 'Forfait client',
      reference: '/customer-service-packages',
    },
    { key: 'observation', label: 'Observations', multiline: true },
    {
      key: 'treatment_zones',
      label: 'Zones traitées',
      array: true,
      multiline: true,
    },
  ],
  appointments: [
    customer,
    service,
    { key: 'starts_at', label: 'Début', required: true, date: true },
    { key: 'ends_at', label: 'Fin', date: true },
    { key: 'notes', label: 'Notes', multiline: true },
    {
      key: 'status',
      label: 'Statut',
      choices: ['pending', 'confirmed', 'cancelled', 'postponed', 'absent', 'completed'],
    },
  ],
  payment: [
    {
      key: 'type_id',
      label: 'Mode de paiement',
      required: true,
      reference: '/types/payments',
      integer: true,
    },
    {
      key: 'statuse_id',
      label: 'Statut du paiement',
      required: true,
      reference: '/statuses?src=payments',
      integer: true,
    },
    { key: 'payingAmount', label: 'Montant du règlement', required: true, numeric: true },
    { key: 'receivedAmount', label: 'Montant reçu', numeric: true },
    { key: 'ref', label: 'Référence' },
    { key: 'date', label: 'Date', date: true },
    { key: 'note', label: 'Note', multiline: true },
  ],
};

export function formPayload(fields: CrmField[], values: Record<string, string>) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = (values[field.key] ?? '').trim();
    if (!value && field.key === 'sort_order') {
      payload[field.key] = 0;
      continue;
    }
    if (!value) {
      if (field.required) throw new Error(`${field.label} : champ obligatoire.`);
      payload[field.key] = field.array
        ? []
        : field.date || field.reference || field.numeric
          ? null
          : '';
      continue;
    }
    if (field.choices && !field.choices.includes(value))
      throw new Error(`${field.label} : choix invalide.`);
    if (field.numeric || (field.reference && field.integer)) {
      const number = Number(value.replace(',', '.'));
      if (!Number.isFinite(number) || number < 0 || (field.integer && !Number.isInteger(number)))
        throw new Error(`${field.label} : valeur invalide.`);
      if (['sessions_count', 'recommended_sessions'].includes(field.key) && number < 1)
        throw new Error(`${field.label} : minimum 1.`);
      if (field.key === 'payingAmount' && number <= 0)
        throw new Error('Le règlement doit être supérieur à zéro.');
      payload[field.key] = number;
    } else if (field.date) {
      if (
        !/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(value) ||
        !Number.isFinite(Date.parse(value))
      )
        throw new Error(`${field.label} : utilisez AAAA-MM-JJ ou AAAA-MM-JJ HH:mm.`);
      payload[field.key] = value.replace('T', ' ');
    } else {
      payload[field.key] = field.array
        ? value
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean)
        : value;
    }
  }
  if (payload.ends_at && payload.starts_at && String(payload.ends_at) < String(payload.starts_at))
    throw new Error('La fin doit être après le début.');
  return payload;
}
