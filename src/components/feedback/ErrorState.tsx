import { useTranslation } from '@/i18n/useTranslation';
import { normalizeApiError } from '@/services/api/apiError';
import { errorMessage } from '@/utils/errorMessage';

import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const translator = useTranslation();
  const kind = normalizeApiError(error).kind;
  const offline = kind === 'network' || kind === 'timeout';

  return (
    <EmptyState
      icon={offline ? 'cloud-off' : 'error-outline'}
      tone="error"
      title={title ?? (offline ? translator.t('mobile.common.offlineTitle') : translator.t('mobile.common.errorTitle'))}
      message={errorMessage(error, translator)}
      actionLabel={onRetry ? translator.t('mobile.common.retry') : undefined}
      onAction={onRetry}
    />
  );
}
