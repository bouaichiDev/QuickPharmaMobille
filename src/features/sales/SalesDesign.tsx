import { PageHeader } from '@/components/navigation/PageHeader';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CrmPage } from '@/features/crm/components/CrmDesign';

export const pos = {
  blue: '#00417c',
  teal: '#006a63',
  mint: '#72f4e7',
  ink: '#0b1c30',
  muted: '#727782',
  bg: '#f8f9ff',
  pale: '#eff4ff',
  light: '#d5e3ff',
  red: '#ba1a1a',
};
export const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function PosButton({
  label,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  loading = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        compact && s.compact,
        secondary && s.secondaryButton,
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? pos.blue : '#fff'} />
      ) : icon ? (
        <Icon name={icon} color={secondary ? 'primary' : 'onPrimary'} size={compact ? 18 : 22} />
      ) : null}
      <AppText
        variant={compact ? 'labelMd' : 'labelLg'}
        style={{ color: secondary ? pos.blue : '#fff', flexShrink: 1, textAlign: 'center' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
export function PosHeader({
  title,
  onBack,
  accessory,
}: {
  title: string;
  onBack?: () => void;
  accessory?: ReactNode;
}) {
  return (
    <View>
      <PageHeader title={title} onBack={onBack} />
      {accessory}
    </View>
  );
}
export function PosPage({
  title,
  onClose,
  children,
  footer,
  scroll = true,
  steps,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  steps?: number;
}) {
  return (
    <CrmPage
      visible
      title={title}
      onClose={onClose}
      scroll={scroll}
      header={
        <View>
          <PosHeader title={title} onBack={onClose} />
          {steps !== undefined ? <PosSteps current={steps} /> : null}
        </View>
      }
      footer={footer ? <View style={[s.footer, { flex: 1 }]}>{footer}</View> : undefined}
    >
      {children}
    </CrmPage>
  );
}
export function PosSteps({ current }: { current: number }) {
  return (
    <View style={s.steps}>
      {['Produits', 'Panier', 'Paiement'].map((label, index) => (
        <View key={label} style={[s.row, { flex: 1, gap: 6 }]}>
          <View
            style={[
              s.step,
              {
                backgroundColor:
                  index < current ? pos.teal : index === current ? pos.blue : pos.light,
              },
            ]}
          >
            {index < current ? (
              <Icon name="check" color="onPrimary" size={18} />
            ) : (
              <AppText variant="labelLg" style={{ color: index === current ? '#fff' : pos.ink }}>
                {index + 1}
              </AppText>
            )}
          </View>
          <AppText
            variant="labelMd"
            style={{ color: index === current ? pos.blue : pos.muted, flexShrink: 1 }}
          >
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
}
export function PosSearch({
  value,
  onChange,
  placeholder,
  onScan,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  onScan?: () => void;
}) {
  return (
    <View style={s.search}>
      <Icon name="search" color="outline" size={21} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={pos.muted}
        style={s.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {onScan ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scanner un produit"
          onPress={onScan}
          style={[s.iconTile, { backgroundColor: '#aff8f0' }]}
        >
          <Icon name="qr-code-scanner" color="primary" size={21} />
        </Pressable>
      ) : value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          onPress={() => onChange('')}
          style={s.iconButton}
        >
          <Icon name="close" color="outline" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}
export function PosBadge({
  label,
  tone = 'blue',
  icon,
}: {
  label: string;
  tone?: 'blue' | 'teal' | 'red' | 'muted';
  icon?: IconName;
}) {
  const color =
    tone === 'teal' ? pos.teal : tone === 'red' ? pos.red : tone === 'muted' ? pos.muted : pos.blue;
  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor:
            tone === 'teal'
              ? '#ccfbf3'
              : tone === 'red'
                ? '#ffdad6'
                : tone === 'muted'
                  ? pos.pale
                  : pos.light,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={13} style={{ color }} /> : null}
      <AppText variant="labelSm" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}
export function PosAvatar({ name }: { name: string }) {
  return (
    <View style={s.avatar}>
      <AppText variant="headlineSm" style={{ color: pos.teal }}>
        {name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((x) => x[0])
          .join('')
          .toUpperCase() || 'C'}
      </AppText>
    </View>
  );
}
export function PosMetric({
  label,
  value,
  tone = 'blue',
  large = false,
}: {
  label: string;
  value: unknown;
  tone?: 'blue' | 'teal' | 'red';
  large?: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <AppText
        variant="labelSm"
        style={{ color: tone === 'blue' ? pos.muted : tone === 'teal' ? pos.teal : pos.red }}
      >
        {label}
      </AppText>
      <AppText
        variant={large ? 'dataMetric' : 'labelLg'}
        style={{ color: tone === 'teal' ? pos.teal : tone === 'red' ? pos.red : pos.blue }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {money(value)}{' '}
        <AppText variant="bodySm" style={{ color: pos.muted }}>
          DH
        </AppText>
      </AppText>
    </View>
  );
}
export function PosLine({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: unknown;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <View style={[s.row, { justifyContent: 'space-between' }]}>
      <AppText variant={strong ? 'labelLg' : 'bodyMd'} style={s.grow}>
        {label}
      </AppText>
      <AppText
        variant={strong ? 'headlineMd' : 'dataTabular'}
        style={{ color: tone ?? pos.ink, flexShrink: 1 }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {money(value)} DH
      </AppText>
    </View>
  );
}
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: pos.bg },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stack: { gap: 14 },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: pos.bg,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f0f2f8',
  },
  inset: { backgroundColor: pos.pale, borderRadius: 12, padding: 12, gap: 10 },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: pos.blue,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compact: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 14 },
  secondaryButton: { backgroundColor: '#e5eeff' },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5eeff',
  },
  productTile: {
    width: 52,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: pos.ink,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#aaf8ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  steps: {
    padding: 16,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  step: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  footer: { gap: 10, width: '100%', maxWidth: 680, alignSelf: 'center' },
  divider: { height: 1, backgroundColor: '#dce9ff', marginVertical: 4 },
  success: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: pos.mint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
});
