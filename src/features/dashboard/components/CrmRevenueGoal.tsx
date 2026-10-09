import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { CrmPage } from '@/features/crm/components/CrmDesign';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { formatAmount } from '@/utils/format';

export function CrmRevenueGoal({
  revenue,
  previewGoal,
}: {
  revenue: number;
  previewGoal?: number;
}) {
  const store = useSessionStore((s) => s.session?.activeStore?.id);
  const user = useSessionStore((s) => s.session?.userId);
  const key = `crm-goal:${user}:${store}`;
  const [goalState, setGoalState] = useState<{ key: string; value?: number }>({
    key,
    value: previewGoal,
  });
  const goal = goalState.key === key ? goalState.value : undefined;
  const setGoal = (value: number) => setGoalState({ key, value });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const currency = useCurrency();
  const { locale } = useTranslation();
  useEffect(() => {
    let current = true;
    if (previewGoal !== undefined) {
      return;
    }
    void AsyncStorage.getItem(key)
      .then((value) => {
        if (current)
          setGoalState({ key, value: value && Number(value) > 0 ? Number(value) : undefined });
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [key, previewGoal]);
  const percent = goal ? (revenue / goal) * 100 : 0;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Modifier l’objectif mensuel"
        onPress={() => {
          setDraft(goal ? String(goal) : '');
          setOpen(true);
        }}
        style={{ gap: 6 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <AppText variant="labelSm" color="onPrimary">
            Objectif : {goal ? formatAmount(goal, currency, locale) : 'Définir un objectif'}
          </AppText>
          {goal ? (
            <AppText variant="labelSm" style={{ color: '#75f7ea' }}>
              {Math.round(percent * 10) / 10}% atteint
            </AppText>
          ) : null}
        </View>
        <View
          style={{ height: 8, borderRadius: 4, backgroundColor: '#ffffff30', overflow: 'hidden' }}
        >
          <View
            style={{
              height: 8,
              width: `${Math.min(100, Math.max(0, percent))}%`,
              backgroundColor: '#72f4e7',
              borderRadius: 4,
            }}
          />
        </View>
      </Pressable>
      <CrmPage visible={open} title="Objectif mensuel" onClose={() => setOpen(false)}>
        <TextField
          appearance="crm"
          label={`Objectif (${currency})`}
          value={draft}
          onChangeText={setDraft}
          keyboardType="decimal-pad"
        />
        <Button
          label="Enregistrer"
          disabled={!Number(draft) || Number(draft) < 0}
          onPress={() => {
            const next = Number(draft);
            if (previewGoal !== undefined) {
              setGoal(next);
              setOpen(false);
              return;
            }
            void AsyncStorage.setItem(key, String(next))
              .then(() => {
                setGoal(next);
                setOpen(false);
              })
              .catch(() => setError('Impossible d’enregistrer l’objectif.'));
          }}
        />
        {error ? <AppText color="error">{error}</AppText> : null}
        <AppText variant="bodySm" color="outline">
          Cet objectif est enregistré sur cet appareil pour l’établissement actif.
        </AppText>
      </CrmPage>
    </>
  );
}
