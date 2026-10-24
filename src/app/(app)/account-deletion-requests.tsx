import { useAccountTranslation } from '@/i18n/useAccountTranslation';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useSessionStore } from '@/features/auth/sessionStore';
import { AccountPrivacy } from '@/features/profile/components/AccountPrivacy';
export default function AccountDeletionRequests() {
  const ta = useAccountTranslation();
  const role = useSessionStore((s) => s.session?.role);
  return (
    <Screen edges={['bottom']}>
      <AppText variant="headlineLg">{ta('account_security_requests_short')}</AppText>
      {role?.toLowerCase() === 'superadmin' ? (
        <AccountPrivacy management />
      ) : (
        <AppText>{ta('account_security_superadmin_access')}</AppText>
      )}
    </Screen>
  );
}
