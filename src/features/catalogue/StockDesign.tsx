import { useContext, useEffect, useState, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CrmPage } from '@/features/crm/components/CrmDesign';
import { pos, money } from '@/features/sales/SalesDesign';
import { fontFamilies } from '@/theme';
import { useSessionStore } from '@/features/auth/sessionStore';
import { StockContext } from './StockContext';
export { money, pos };
export function StockScopeBanner({ compact = false }: { compact?: boolean }) {
  const preview = useContext(StockContext),
    name = useSessionStore((s) => s.session?.activeStore?.name);
  if (compact)
    return (
      <AppText variant="labelSm" color="outline">
        {name || (preview ? 'Officine Saint-Michel' : 'Établissement actif')}
      </AppText>
    );
  return (
    <View style={[st.row, { padding: 12, borderRadius: 8, backgroundColor: '#e5eeff' }]}>
      <Icon name="storefront" color="primary" size={20} />
      <View style={st.grow}>
        <AppText variant="labelSm" color="primary">
          OFFICINE PRINCIPALE
        </AppText>
        <AppText variant="labelMd">
          {name || (preview ? 'Pharmacie Centrale Saint-Germain' : 'Établissement actif')}
        </AppText>
      </View>
    </View>
  );
}
export function stockDate(value: string) {
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR') : 'Non renseignée';
}
export function useDebounce(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}
export function StockPage({
  title,
  children,
  footer,
  onClose,
  scroll = true,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  scroll?: boolean;
}) {
  return (
    <CrmPage
      scroll={scroll}
      visible
      title={title}
      onClose={onClose}
      header={
        <View
          style={{
            height: 64,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderBottomWidth: 1,
            borderColor: '#edf0f8',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={onClose}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="arrow-back" color="primary" size={24} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="labelSm" color="primary" style={{ fontSize: 10, lineHeight: 12 }}>
              STOCK
            </AppText>
            <AppText variant="headlineSm" numberOfLines={2}>
              {title}
            </AppText>
          </View>
        </View>
      }
      footer={footer ? <View style={{ flex: 1, gap: 8 }}>{footer}</View> : undefined}
    >
      {children}
    </CrmPage>
  );
}
export function SCard({
  children,
  tone,
  compact = false,
}: {
  children: ReactNode;
  tone?: string;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        st.card,
        compact && { padding: 12, gap: 8 },
        tone ? { backgroundColor: tone } : undefined,
      ]}
    >
      {children}
    </View>
  );
}
export function SButton({
  label,
  onPress,
  icon,
  secondary = false,
  teal = false,
  disabled = false,
  busy = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  teal?: boolean;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        st.button,
        secondary && { backgroundColor: '#e5eeff' },
        teal && { backgroundColor: pos.teal },
        compact && { minHeight: 36, paddingVertical: 7 },
        (disabled || busy) && { opacity: 0.45 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? pos.blue : '#fff'} />
      ) : icon ? (
        <Icon name={icon} size={compact ? 16 : 20} color={secondary ? 'primary' : 'onPrimary'} />
      ) : null}
      <AppText
        variant={compact ? 'labelSm' : 'labelMd'}
        style={{ color: secondary ? pos.blue : '#fff', textAlign: 'center', flexShrink: 1 }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
export function SBadge({
  label,
  tone = 'blue',
}: {
  label: string;
  tone?: 'blue' | 'teal' | 'red' | 'grey' | 'amber';
}) {
  return (
    <View
      style={[
        st.badge,
        {
          backgroundColor:
            tone === 'red'
              ? '#ffdad6'
              : tone === 'amber'
                ? '#fff2d7'
                : tone === 'teal'
                  ? '#d7faf2'
                  : '#e5eeff',
        },
      ]}
    >
      <AppText
        variant="labelSm"
        style={{
          color:
            tone === 'red'
              ? pos.red
              : tone === 'amber'
                ? '#8b5800'
                : tone === 'teal'
                  ? pos.teal
                  : tone === 'grey'
                    ? pos.muted
                    : pos.blue,
          fontSize: 11,
          lineHeight: 14,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}
export function STabs({
  values,
  value,
  onChange,
}: {
  values: [string, string][];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[st.row, { gap: 6 }]}
      style={{ flexGrow: 0 }}
    >
      {values.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: key === value }}
          onPress={() => onChange(key)}
          style={[st.tab, key === value && { backgroundColor: pos.blue }]}
        >
          <AppText
            variant="labelSm"
            style={{ fontSize: 11, color: key === value ? '#fff' : pos.blue }}
          >
            {label}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function SSearch({
  value,
  onChange,
  placeholder = 'Rechercher un produit…',
  onScan,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onScan?: () => void;
  inputRef?: Ref<TextInput>;
}) {
  return (
    <View style={st.search}>
      <Icon name="search" color="outline" size={18} />
      <TextInput
        ref={inputRef}
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={pos.muted}
        value={value}
        onChangeText={onChange}
        style={st.input}
      />
      {onScan ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scanner un code-barres"
          style={st.scan}
          onPress={onScan}
        >
          <Icon name="qr-code-scanner" color="onPrimary" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}
export function SField({
  label,
  value,
  onChange,
  numeric = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 7 }}>
      <AppText variant="labelMd">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'number-pad' : 'default'}
        multiline={multiline}
        style={[st.field, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}
export function SHeading({
  title,
  icon,
  aside,
}: {
  title: string;
  icon: IconName;
  aside?: ReactNode;
}) {
  return (
    <View style={st.row}>
      <Icon name={icon} color="primary" size={19} />
      <AppText variant="labelLg" style={{ flex: 1 }}>
        {title}
      </AppText>
      {aside}
    </View>
  );
}
export function SNote({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <View style={[st.note, error && { backgroundColor: '#ffdad6' }]}>
      <Icon
        name={error ? 'error-outline' : 'info-outline'}
        color={error ? 'error' : 'primary'}
        size={18}
      />
      <AppText variant="bodySm" style={{ flex: 1, color: error ? pos.red : pos.blue }}>
        {children}
      </AppText>
    </View>
  );
}
export function SProgress({ count, total }: { count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <View style={{ gap: 7 }}>
      <View style={st.row}>
        <AppText variant="bodySm" style={{ flex: 1 }}>
          Progression du comptage
        </AppText>
        <AppText variant="labelMd" color="primary">
          {count} / {total} ({pct} %)
        </AppText>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: '#e5eeff' }}>
        <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: pos.teal }} />
      </View>
    </View>
  );
}
export function ScannerGuide() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: '76%', height: 116 }}>
        {[
          { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
          { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
          {
            bottom: 0,
            left: 0,
            borderBottomWidth: 3,
            borderLeftWidth: 3,
            borderBottomLeftRadius: 10,
          },
          {
            bottom: 0,
            right: 0,
            borderBottomWidth: 3,
            borderRightWidth: 3,
            borderBottomRightRadius: 10,
          },
        ].map((corner, i) => (
          <View
            key={i}
            style={[
              { position: 'absolute', width: 25, height: 25, borderColor: '#72f4e7' },
              corner,
            ]}
          />
        ))}
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: 12,
            right: 12,
            height: 2,
            backgroundColor: '#ff5b59',
          }}
        />
      </View>
    </View>
  );
}
export const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: pos.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#e5eeff' },
  search: {
    minHeight: 48,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 6,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: pos.ink,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    paddingVertical: 10,
  },
  scan: { padding: 9, borderRadius: 7, backgroundColor: pos.teal },
  field: {
    minHeight: 44,
    padding: 12,
    backgroundColor: '#eff4ff',
    borderRadius: 9,
    color: pos.ink,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  note: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e5eeff',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  section: { gap: 14, padding: 16 },
  divider: { height: 1, backgroundColor: '#e5eeff' },
  metric: { flex: 1, padding: 12, borderRadius: 9, backgroundColor: '#eff4ff', gap: 4 },
});
