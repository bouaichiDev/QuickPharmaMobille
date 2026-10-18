import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme';
import { useResponsiveLayout } from './useResponsiveLayout';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  keyboard?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  background?: keyof typeof colors;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  edges = ['top'],
  keyboard = false,
  header,
  footer,
  contentStyle,
  innerStyle,
  background = 'background',
}: ScreenProps) {
  const { landscape } = useResponsiveLayout();
  const body = scroll ? (
    <ScrollView
      testID="screen-scroll-content"
      contentContainerStyle={[styles.content, styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      <View style={[styles.inner, innerStyle]}>{children}</View>
    </ScrollView>
  ) : (
    <View testID="screen-static-content" style={[styles.content, styles.fill, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={landscape ? Array.from(new Set<Edge>([...edges, 'left', 'right'])) : edges}
      style={[styles.fill, { backgroundColor: colors[background] }]}
    >
      {header}
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
          {footer}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {footer}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    gap: spacing.xl,
    flexGrow: 1,
  },
  scrollContent: { paddingBottom: spacing.xxxl },
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.xl,
  },
});
