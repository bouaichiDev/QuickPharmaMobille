import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  tall?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  tall = false,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [offset] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (visible) offset.setValue(0);
  }, [visible, offset]);
  const pointerStart = useRef<number | null>(null);
  const finishDrag = (dy: number, velocity = 0) => {
    if (dy > 90 || (dy > 20 && velocity > 0.8)) {
      Animated.timing(offset, {
        toValue: 800,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) onClose();
      });
    } else {
      Animated.spring(offset, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    }
  };
  // React Native Web forwards DOM pointer events; native platforms use PanResponder.
  const webGesture = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      pointerStart.current = event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerStart.current !== null)
        offset.setValue(Math.max(0, event.clientY - pointerStart.current));
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerStart.current === null) return;
      const dy = event.clientY - pointerStart.current;
      pointerStart.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      finishDrag(dy);
    },
    onPointerCancel: () => {
      pointerStart.current = null;
      finishDrag(0);
    },
  };
  const gesture = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, state) =>
      state.dy > 8 && Math.abs(state.dy) > Math.abs(state.dx),
    onPanResponderMove: (_, state) => offset.setValue(Math.max(0, state.dy)),
    onPanResponderRelease: (_, state) => finishDrag(state.dy, state.vy),
    onPanResponderTerminate: () =>
      Animated.spring(offset, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(),
  });
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
          accessibilityLabel={title}
        />
        <Animated.View
          style={[
            styles.sheet,
            tall && { maxHeight: '92%' },
            { paddingBottom: insets.bottom + spacing.lg, transform: [{ translateY: offset }] },
          ]}
          accessibilityViewIsModal
        >
          <View
            {...(Platform.OS === 'web'
              ? (webGesture as unknown as ViewProps)
              : gesture.panHandlers)}
            style={styles.dragArea}
          >
            <View style={styles.handle} />
            <AppText variant="headlineSm" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="bodyMd" color="onSurfaceVariant">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.content}
            contentContainerStyle={styles.contentInner}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dragArea: { paddingVertical: spacing.sm, gap: spacing.xs },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.outlineVariant,
    marginBottom: spacing.md,
  },
  content: {
    marginTop: spacing.md,
  },
  contentInner: {
    gap: spacing.sm,
  },
});
