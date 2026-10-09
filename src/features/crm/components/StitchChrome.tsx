import type { RefObject } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors } from '@/theme';

export function CrmFilter({
  label,
  selected = false,
  count,
  onPress,
}: {
  label: string;
  selected?: boolean;
  count?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filter, selected && { backgroundColor: colors.primary }]}
    >
      <AppText
        style={{ fontSize: 11, lineHeight: 14 }}
        variant="labelSm"
        color={selected ? 'onPrimary' : 'onSurfaceVariant'}
      >
        {label}
      </AppText>
      {count !== undefined ? (
        <View
          style={{
            backgroundColor: selected ? '#ffffff26' : '#e5eeff',
            paddingHorizontal: 6,
            borderRadius: 10,
          }}
        >
          <AppText
            variant="labelSm"
            style={{ fontSize: 10 }}
            color={selected ? 'onPrimary' : 'primary'}
          >
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CrmFormHeading({
  title,
  moduleKey,
  editing = false,
}: {
  title: string;
  moduleKey: string;
  editing?: boolean;
}) {
  const client = moduleKey === 'clients';
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="headlineMd">{title}</AppText>
          <AppText variant="bodySm" color="secondary">
            {editing
              ? 'Modification du dossier'
              : client
                ? 'Création de fiche patient'
                : moduleKey === 'services'
                  ? 'Enregistrez un protocole de soin pour votre patientèle en officine ou cabine esthétique.'
                  : moduleKey === 'sessions'
                    ? 'Enregistrement de soin en cabine'
                    : 'Enregistrement des informations'}
          </AppText>
        </View>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#e5eeff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            name={client ? 'person-add' : moduleKey === 'sessions' ? 'spa' : 'medical-services'}
            size={22}
            color="primary"
          />
        </View>
      </View>
      {client ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#eff4ff',
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#d3e4fe',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="person-outline" color="primary" />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="labelLg">Profil Patient</AppText>
            <AppText variant="bodySm" color="outline">
              Renseignez les données cliniques du dossier
            </AppText>
          </View>
          <View style={{ padding: 5, borderRadius: 14, backgroundColor: '#ffdad6' }}>
            <AppText variant="labelSm" color="error">
              Requis
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
}
export function CrmShellHeader({
  name,
  onStore,
  onSearch,
  onScan,
}: {
  name: string;
  onStore?: () => void;
  onSearch?: () => void;
  onScan?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
      <View style={styles.shell}>
        <View style={styles.mark}>
          <Icon name="medical-services" size={22} color="primary" />
        </View>
        <Pressable
          style={{ flex: 1, gap: 2 }}
          onPress={onStore}
          accessibilityRole="button"
          accessibilityLabel="Établissement actif"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <AppText variant="labelSm" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </AppText>
            <Icon name="expand-more" size={14} />
          </View>
          <AppText variant="labelSm" color="secondary" style={{ fontSize: 10 }}>
            ● Services CRM
          </AppText>
        </Pressable>
        {onSearch ? (
          <Pressable onPress={onSearch} accessibilityLabel="Rechercher" style={styles.headerAction}>
            <Icon name="search" size={21} color="outline" />
          </Pressable>
        ) : null}
        {onScan ? (
          <Pressable onPress={onScan} accessibilityLabel="Scanner" style={styles.headerAction}>
            <Icon name="qr-code-scanner" size={21} color="outline" />
          </Pressable>
        ) : null}

      </View>
    </View>
  );
}
export function CrmListHeading({
  title,
  subtitle,
  count,
  action,
  onCreate,
  disabled,
}: {
  title: string;
  subtitle: string;
  count?: string;
  action: string;
  onCreate?: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.heading}>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <AppText
            numberOfLines={title.startsWith('Rendez-vous') ? 1 : 2}
            variant="headlineMd"
            style={{ flexShrink: 1, fontSize: 20, lineHeight: 27 }}
          >
            {title}
          </AppText>
          {count ? (
            <View
              style={{
                backgroundColor: '#d3e4fe',
                borderRadius: 16,
                paddingHorizontal: 8,
                paddingVertical: 3,
                maxWidth: 72,
              }}
            >
              <AppText variant="labelSm" color="primary" style={{ fontSize: 10, lineHeight: 12 }}>
                {count}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="bodySm" color="onSurfaceVariant">
          {subtitle}
        </AppText>
      </View>
      {onCreate ? (
        <Pressable
          disabled={disabled}
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel={action}
          style={[styles.create, disabled && { opacity: 0.4 }]}
        >
          <Icon name="add-circle-outline" size={18} color="onPrimary" />
          <AppText variant="labelLg" color="onPrimary" style={{ fontSize: 13 }}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
export function CrmSearch({
  value,
  onChange,
  placeholder = 'Rechercher par client, soin, praticien…',
  onScan,
  inputRef,
}: {
  inputRef?: RefObject<TextInput | null>;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  onScan?: () => void;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={20} color="outline" />
      <TextInput
        ref={inputRef}
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        value={value}
        onChangeText={onChange}
        style={{ flex: 1, fontSize: 14, color: colors.onSurface, minWidth: 0 }}
      />
      {onScan ? (
        <Pressable accessibilityLabel="Scanner" onPress={onScan} style={styles.scan}>
          <Icon name="qr-code-scanner" size={18} color="primary" />
        </Pressable>
      ) : null}
    </View>
  );
}
export function CrmMiniAction({
  label,
  icon,
  onPress,
  primary = false,
}: {
  label: string;
  icon: IconName;
  onPress?: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.miniAction, primary && { backgroundColor: colors.secondary }]}
    >
      <Icon name={icon} size={15} color={primary ? 'onPrimary' : 'primary'} />
      <AppText variant="labelSm" color={primary ? 'onPrimary' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  shell: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f8',
  },
  mark: {
    width: 32,
    height: 32,
    backgroundColor: '#e5eeff',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAction: { padding: 7 },
  heading: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  create: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0px 2px 4px #00417c25',
  },
  filter: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 28,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  search: {
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  scan: { padding: 7, backgroundColor: '#e5eeff', borderRadius: 8 },
  miniAction: {
    backgroundColor: '#e5eeff',
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 30,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
