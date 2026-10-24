import { backendMenuGroups, type MobileMenuGroup } from './backendMenu';
import { useEffect, useRef, useState } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { crmStyles } from '@/features/crm/components/CrmDesign';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { can } from '@/features/crm/modules';
import { useTranslation } from '@/i18n/useTranslation';
import { colors } from '@/theme';

export function ServicesMenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const access = useAccess();
  const session = useSessionStore((state) => state.session);
  const { t, tDynamic } = useTranslation();
  const [search, setSearch] = useState('');
  const destination = useRef<string | null>(null);
  useEffect(() => {
    if (visible || !destination.current) return;
    const href = destination.current;
    destination.current = null;
    // Wait for the native menu overlay to unmount before changing screens.
    const frame = requestAnimationFrame(() => router.push(href as Href));
    return () => cancelAnimationFrame(frame);
  }, [visible]);
  function open(href: string) {
    if (!visible || destination.current) return;
    destination.current = href;
    onClose();
    setSearch('');
  }
  const support = !!session?.supportAccess;
  const menuAccess =
    support && access.data
      ? { ...access.data, role: { ...access.data.role, code: 'Assistance' } }
      : access.data;
  const backendGroups = backendMenuGroups(
    menuAccess,
    support ? (access.data?.menus ?? []) : (session?.menus ?? access.data?.menus ?? []),
    tDynamic,
  );
  const groups: MobileMenuGroup[] = [
    ...backendGroups,
    ...(!support
      ? [
          {
            title: tDynamic('mobile.menu.account', 'Mon compte'),
            items: [
              {
                label: tDynamic('mobile.menu.profile', 'Profil et réglages'),
                icon: 'person-outline' as IconName,
                href: '/profile',
              },
              {
                label: t('mobile.nav.notifications'),
                icon: 'notifications-none' as IconName,
                href: '/notifications',
              },
              ...(can(access.data, 'subscription.view') &&
              !backendGroups.some((group) => group.items.some((item) => item.href === '/plans'))
                ? [
                    {
                      label: t('mobile.plans.title'),
                      icon: 'workspace-premium' as IconName,
                      href: '/plans',
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ];
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      tall
      title={
        !support && access.data?.role.code === 'SuperAdmin'
          ? tDynamic('mobile.menu.superadmin.title', 'Administration')
          : tDynamic('mobile.menu.storeTitle', 'Menu du magasin')
      }
      subtitle={`${session?.activeStore?.name ?? 'QuickPharma'} · ${support ? 'Lecture seule' : (access.data?.role.code ?? session?.role ?? '')}`}
    >
      {access.isLoading ? (
        <SkeletonCards count={2} />
      ) : access.isError ? (
        <ErrorState error={access.error} onRetry={() => void access.refetch()} />
      ) : (
        <ServicesMenuContent groups={groups} search={search} onSearch={setSearch} onOpen={open} />
      )}
    </BottomSheet>
  );
}
export function ServicesMenuContent({
  groups,
  search,
  onSearch,
  onOpen,
}: {
  groups: MobileMenuGroup[];
  search: string;
  onSearch: (value: string) => void;
  onOpen: (href: string) => void;
}) {
  const { tDynamic } = useTranslation();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  return (
    <>
      <TextField
        appearance="crm"
        placeholder="Rechercher une fonction…"
        label={tDynamic('mobile.menu.searchMenu', 'Rechercher un menu')}
        value={search}
        onChangeText={onSearch}
      />
      {groups.map((group, index) => {
        const items = group.items.filter((item) =>
          item.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
        );
        return items.length ? (
          <View key={`${index}-${group.title}`} style={styles.group}>
            <Pressable
              style={crmStyles.row}
              disabled={!group.parent}
              accessibilityRole={group.parent ? 'button' : undefined}
              accessibilityState={
                group.parent ? { expanded: !!expanded[index] || !!search } : undefined
              }
              onPress={() => setExpanded((current) => ({ ...current, [index]: !current[index] }))}
            >
              <AppText
                variant="headlineSm"
                style={[crmStyles.grow, { fontSize: 14, lineHeight: 20 }]}
              >
                {group.title}
              </AppText>
              <AppText variant="labelSm" color="secondary">
                {items.length} modules
              </AppText>
              {group.parent ? (
                <Icon name={expanded[index] || search ? 'expand-less' : 'expand-more'} size={20} />
              ) : null}
            </Pressable>
            {!group.parent || expanded[index] || search ? (
              <View style={styles.grid}>
                {items.map((item) => (
                  <Pressable
                    key={item.href}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}${item.reason ? ` · ${item.reason}` : ''}`}
                    accessibilityState={{ disabled: !!item.disabled }}
                    disabled={item.disabled}
                    onPress={() => onOpen(item.href)}
                    style={({ pressed }) => [
                      styles.tile,
                      item.disabled && {
                        opacity: 0.5,
                        backgroundColor: colors.surfaceContainerHigh,
                      },
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <View style={styles.icon}>
                      <Icon name={item.icon} color="primary" size={20} />
                    </View>
                    <View style={styles.copy}>
                      <AppText variant="labelLg" numberOfLines={1} style={{ fontSize: 13 }}>
                        {item.label}
                      </AppText>
                      <AppText
                        variant="bodySm"
                        color="outline"
                        numberOfLines={1}
                        style={{ fontSize: 11 }}
                      >
                        {item.reason ??
                          descriptions[item.href.split('/').pop() ?? ''] ??
                          'Accéder à cet espace'}
                      </AppText>
                    </View>
                    <Icon
                      name={item.disabled ? 'construction' : 'chevron-right'}
                      size={18}
                      color="outline"
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null;
      })}
    </>
  );
}
const descriptions: Record<string, string> = {
  dashboard: 'Flux et indicateurs de votre activité',
  clients: 'Dossiers clients et historique de soins',
  sessions: 'Soins, prescriptions et règlements',
  appointments: 'Agenda et planning de votre équipe',
  services: 'Prestations, durées et tarifs',
  'service-packages': 'Modèles de cures et programmes',
  packages: 'Séances disponibles et soldes clients',
  payments: 'Encaissements et règlements reçus',
  reports: 'Revenus et statistiques des services',
  timeline: 'Journal des opérations et traçabilité',
  'form-builder': 'Champs personnalisés par service',
  'care-catalogs': 'Maladies et médicaments',
};
const styles = StyleSheet.create({
  group: { gap: 8, marginTop: 12 },
  grid: { gap: 8 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    minHeight: 50,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  icon: {
    width: 32,
    height: 32,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
});
