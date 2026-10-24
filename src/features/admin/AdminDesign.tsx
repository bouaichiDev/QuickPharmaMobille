import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import {
  CommerceScreen,
  AppText,
  Button,
  TextField,
  Notice,
  ui,
  useCommerceAccess,
} from '@/features/commerce/CommerceUI';
export { AppText, Button, TextField, Notice, ui, useCommerceAccess };
export const design = StyleSheet.create({
  stack: { gap: 12 },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e8edf6',
  },
  inset: { backgroundColor: '#eff4ff', borderRadius: 8, padding: 10, gap: 8 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  section: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#00417c' },
});
export function AdminPage({
  title,
  children,
  footer,
  onBack,
  scroll = true,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  scroll?: boolean;
}) {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommerceScreen title={title} footer={footer} onBack={onBack} scroll={scroll}>
        <View style={[design.stack, !scroll ? { flex: 1, padding: 16 } : null]}>
          <AppText style={design.title}>{title}</AppText>
          {children}
        </View>
      </CommerceScreen>
    </>
  );
}
export function Panel({
  title,
  children,
  icon,
}: {
  title?: string;
  children: ReactNode;
  icon?: IconName;
}) {
  return (
    <View style={design.panel}>
      {title ? (
        <View style={design.row}>
          {icon ? <Icon name={icon} size={20} color="primary" /> : null}
          <AppText style={design.section}>{title}</AppText>
        </View>
      ) : null}
      {children}
    </View>
  );
}
export function Fold({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={design.row}
      >
        <AppText variant="labelLg" style={design.grow}>
          {label}
        </AppText>
        <Icon name={open ? 'expand-less' : 'expand-more'} />
      </Pressable>
      {open ? children : null}
    </Panel>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={design.row}>
      <AppText style={design.grow}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: '#006a63' }}
      />
    </View>
  );
}
export function Tabs({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
      {values.map((label) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityState={{ selected: label === value }}
          onPress={() => onChange(label)}
          style={{
            minHeight: 44,
            padding: 10,
            borderBottomWidth: 2,
            borderBottomColor: label === value ? '#00417c' : 'transparent',
            backgroundColor: '#eff4ff',
            borderRadius: 6,
          }}
        >
          <AppText variant="labelMd" color="primary">
            {(
              {
                after_lines: 'Après les remises de ligne',
                before_lines: 'Avant les remises de ligne',
                round: 'Arrondi',
                floor: 'Inférieur',
                ceil: 'Supérieur',
                none: 'Sans arrondi',
                percent: 'Pourcentage',
                fixed: 'Montant fixe',
              } as Record<string, string>
            )[label] ?? label}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function FormActions({
  onCancel,
  onSave,
  busy,
  disabled,
}: {
  onCancel: () => void;
  onSave: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={design.row}>
      <Button
        label="Annuler"
        variant="outline"
        fullWidth={false}
        style={design.grow}
        disabled={busy}
        onPress={onCancel}
      />
      <Button
        label="Enregistrer"
        fullWidth={false}
        style={design.grow}
        loading={busy}
        disabled={disabled}
        onPress={onSave}
      />
    </View>
  );
}
export function useDirtyBack(dirty: boolean, onBack: () => void) {
  const [open, setOpen] = useState(false);
  return {
    back: () => (dirty ? setOpen(true) : onBack()),
    dialog: (
      <ConfirmDialog
        visible={open}
        title="Quitter sans enregistrer ?"
        message="Vos modifications ne seront pas enregistrées."
        confirmLabel="Quitter"
        cancelLabel="Rester"
        onConfirm={onBack}
        onCancel={() => setOpen(false)}
      />
    ),
  };
}
export function ReadOnly() {
  const { readOnly } = useCommerceAccess();
  return readOnly ? <Notice>Mode assistance — lecture seule.</Notice> : null;
}
