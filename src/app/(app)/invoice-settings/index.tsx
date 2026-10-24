import { AdminPage } from '@/features/admin/AdminDesign';
import { InvoiceSettings } from '@/features/admin/CompanySettingsScreen';
export default function InvoiceSettingsPage() {
  return (
    <AdminPage title="Paramètres de facturation">
      <InvoiceSettings />
    </AdminPage>
  );
}
