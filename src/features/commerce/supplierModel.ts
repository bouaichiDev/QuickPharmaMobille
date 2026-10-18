import type { Row } from './api';
export function supplierPayload(form: Row, id?: string): Row {
  const text = (key: string) => String(form[key] ?? '').trim();
  if (!text('name') || !text('code') || !text('phone') || !text('email'))
    throw new Error('Renseignez le nom, le code, le téléphone et l’e-mail.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text('email')))
    throw new Error('Adresse e-mail invalide.');
  const credit = Number(text('CreditCeiling').replace(',', '.') || 0),
    discount = Number(text('DefaultDiscount').replace(',', '.') || 0);
  if (
    !Number.isFinite(credit) ||
    credit < 0 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  )
    throw new Error('Plafond de crédit ou remise invalide.');
  return {
    ...(id ? { id } : {}),
    name: text('name'),
    code: text('code'),
    phone: text('phone'),
    email: text('email'),
    active: Number(form.active) === 1 ? 1 : 0,
    CreditCeiling: credit,
    DefaultDiscount: discount,
    OrgCode: text('OrgCode'),
    OrgRegistrationNumber: text('OrgRegistrationNumber'),
    OrgRegistration: text('OrgRegistration'),
  };
}
