import { PermissionGate } from '@/features/access/PermissionGate';
import { PlansScreen } from '@/features/subscriptions/screens/PlansScreen';

export default function PlansRoute() {
  return (
    <PermissionGate anyOf={['subscription.view', 'subscription.manage']}>
      <PlansScreen />
    </PermissionGate>
  );
}
