import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { useTranslation } from '@/i18n/useTranslation';
import { normalizeApiError } from '@/services/api/apiError';
import { SButton, SNote } from './StockDesign';
import { ammpsOnboardingApi, importRequestKey, type AmmpsOffer } from './ammpsOnboardingApi';

export function AmmpsOnboardingBanner({
  scope,
  allowed,
  accessVersion,
  onImported,
}: {
  scope: string;
  allowed: boolean;
  accessVersion?: string;
  onImported: () => void;
}) {
  const client = useQueryClient();
  const { tDynamic, locale } = useTranslation();
  const t = (key: string, fallback: string, params?: Record<string, string | number>) =>
    tDynamic(`ammps_onboarding_${key}`, fallback, params);
  const [confirmation, setConfirmation] = useState<{ offer: AmmpsOffer; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<number | null>(null);
  const queryKey = ['ammps-onboarding', scope, accessVersion];
  const query = useQuery({
    queryKey,
    enabled: allowed && !!scope,
    retry: false,
    staleTime: 30000,
    queryFn: ({ signal }) => ammpsOnboardingApi.offer(scope, signal),
  });
  const offer = allowed ? query.data : undefined;
  const count = offer?.count ?? 0;
  const date = offer?.source_updated_at
    ? new Date(`${offer.source_updated_at.slice(0, 10)}T00:00:00Z`)
    : null;
  const close = () => {
    if (!working.current) {
      setConfirmation(null);
      setError('');
    }
  };
  const confirm = async () => {
    if (!allowed || !confirmation?.offer.offer_token || working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    let created: number;
    try {
      const result = await ammpsOnboardingApi.import(
        scope,
        confirmation.offer.offer_token,
        confirmation.key,
      );
      created = result.created;
    } catch (reason) {
      if (normalizeApiError(reason).status === 409) {
        setConfirmation(null);
        setError(t('changed', 'L’offre a changé. Actualisez la liste et réessayez.'));
        void query.refetch();
      } else {
        // Keep the same UUID on retry: a timeout may follow a committed import.
        setError(t('error', 'L’importation a échoué. Réessayez.'));
      }
      working.current = false;
      setBusy(false);
      return;
    }
    client.setQueryData(queryKey, { visible: false });
    setConfirmation(null);
    setSuccess(created);
    setError('');
    onImported();
    await Promise.all(
      ['catalogue', 'products', 'categories', 'access', 'dashboard'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
    working.current = false;
    setBusy(false);
  };
  if (!allowed || (!offer?.visible && !confirmation && success === null && !error)) return null;
  return (
    <View style={{ gap: 10, marginBottom: 14 }}>
      {success !== null && (
        <SNote>{t('success', '[count] médicaments importés.', { count: success })}</SNote>
      )}
      {error && !confirmation ? <SNote error>{error}</SNote> : null}
      {offer?.visible && (
        <View style={styles.banner}>
          <View style={styles.heading}>
            <Icon name="medication" color="secondary" size={26} />
            <AppText variant="headlineSm" style={{ flex: 1 }}>
              {offer.is_upgrade
                ? t('pharmacy_upgrade_title', 'Complétez votre liste de produits de pharmacie')
                : t('pharmacy_title', 'Préremplissez votre liste de produits de pharmacie')}
            </AppText>
          </View>
          <AppText>
            {t(
              'pharmacy_intro',
              'Ajoutez jusqu’à [count] médicaments issus de la liste AMMPS, selon votre abonnement.',
              { count },
            )}
          </AppText>
          {date && Number.isFinite(date.getTime()) && (
            <AppText variant="bodySm" color="secondary">
              {t('list_updated_at', 'Liste AMMPS mise à jour le [date]', {
                date: date.toLocaleDateString(locale, { timeZone: 'UTC' }),
              })}
            </AppText>
          )}
          <AppText variant="bodySm">
            {t(
              'scope',
              'Stock initial : 0 • prix de vente : PPV AMMPS • catégories et dosages inclus.',
            )}
          </AppText>
          <AppText variant="bodySm" color="outline">
            {t(
              'once',
              'Cette importation est proposée une seule fois pour cet abonnement. Elle peut être proposée à nouveau après un changement d’abonnement.',
            )}
          </AppText>
          <SButton
            teal
          disabled={busy}
            icon="download"
            label={t('pharmacy_button', 'Importer [count] produits', { count })}
            onPress={() => {
              setConfirmation({ offer, key: importRequestKey() });
              setError('');
              setSuccess(null);
            }}
          />
        </View>
      )}
      <SelectionDialog
        visible={!!confirmation}
        title={t('pharmacy_dialog_title', 'Importer les produits de pharmacie AMMPS')}
        onClose={close}
      >
        <AppText>
          {confirmation?.offer.unlimited
            ? t(
                'unlimited',
                'Votre abonnement est illimité : [count] médicaments disponibles seront importés.',
                { count: confirmation.offer.count ?? 0 },
              )
            : t(
                'limits',
                'Votre abonnement autorise encore [remaining] références. [count] seront importées.',
                {
                  remaining: confirmation?.offer.remaining ?? 0,
                  count: confirmation?.offer.count ?? 0,
                },
              )}
        </AppText>
        <AppText>
          {t(
            'purchase',
            'Les produits seront ajoutés sans stock, avec un prix d’achat initial à 0 que vous pourrez renseigner ensuite.',
          )}
        </AppText>
        {error ? <SNote error>{error}</SNote> : null}
        {busy ? (
          <AppText accessibilityRole="alert">
            {t('loading', 'Importation en cours… Veuillez patienter.')}
          </AppText>
        ) : null}
        <SButton
          busy={busy}
          disabled={busy || !allowed}
          label={t('confirm', 'Confirmer l’importation')}
          onPress={() => void confirm()}
        />
        <SButton secondary disabled={busy} label={t('cancel', 'Annuler')} onPress={close} />
      </SelectionDialog>
    </View>
  );
}
const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d5e5e2',
    borderLeftWidth: 4,
    borderLeftColor: '#0f766e',
    backgroundColor: '#f4faf9',
    padding: 16,
    gap: 12,
  },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});
