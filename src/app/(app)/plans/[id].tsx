import { PermissionGate } from '@/features/access/PermissionGate';
import { PlanDetailScreen } from '@/features/subscriptions/screens/PlanDetailScreen';

export default function PlanDetailRoute() {
  return (
    <PermissionGate anyOf={['subscription.view', 'subscription.manage']}>
      <PlanDetailScreen />
    </PermissionGate>
  );
}
