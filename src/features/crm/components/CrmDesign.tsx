import { useContext, useEffect, useId, useMemo, type ReactNode } from 'react';
import { NavigationContext, NavigationRouteContext } from 'expo-router/react-navigation';
import { useIsFocused } from 'expo-router';
import { usePageLayers } from '@/features/navigation/PageLayers';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors } from '@/theme';

/** Layout values from the numbered Stitch CRM exports, independent of API data. */
export const crmStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  inset: { backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  stack: { gap: 12 },
});

export function CrmSection({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: IconName;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={crmStyles.card}>
      <View style={crmStyles.row}>
        {icon ? <Icon name={icon} color="primary" size={21} /> : null}
        <AppText variant="headlineSm" style={crmStyles.grow}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="labelSm" color="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function CrmAvatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = [
    name.trim().split(/\s+/)[0],
    name.trim().split(/\s+/).length > 1 ? name.trim().split(/\s+/).at(-1) : '',
  ]
    .map((part) => part?.[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.avatar, large && styles.largeAvatar]}>
      <AppText variant={large ? 'headlineMd' : 'headlineSm'} color="secondary">
        {initials || 'C'}
      </AppText>
    </View>
  );
}

export function CrmPage({
  visible,
  title,
  onClose,
  footer,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const layers = usePageLayers();
  const id = useId();
  const focused = useIsFocused();
  const navigation = useContext(NavigationContext);
  const route = useContext(NavigationRouteContext);
  const content = useMemo(
    () => (
      <NavigationContext.Provider value={navigation}>
        <NavigationRouteContext.Provider value={route}>
          <SafeAreaView edges={['top']} style={styles.root}>
            <View style={styles.header}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Retour"
                style={styles.back}
              >
                <Icon name="arrow-back" color="primary" />
              </Pressable>
              <AppText variant="headlineSm" numberOfLines={1} style={crmStyles.grow}>
                {title}
              </AppText>
            </View>
            <KeyboardAvoidingView
              style={styles.root}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
              >
                {children}
              </ScrollView>
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </NavigationRouteContext.Provider>
      </NavigationContext.Provider>
    ),
    [children, footer, title, onClose, navigation, route],
  );
  useEffect(() => {
    if (visible && focused) layers?.update(id, content, onClose);
    else layers?.remove(id);
  }, [visible, focused, layers, id, content, onClose]);
  useEffect(() => () => layers?.remove(id), [id, layers]);
  if (layers || !visible) return null;
  return content;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 64,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f8',
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 42, height: 30 },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  footer: {
    padding: 12,
    gap: 8,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#edf0f8',
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatar: { width: 60, height: 60, borderRadius: 30 },
});
