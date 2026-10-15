import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';

type Layer = { id: string; content: ReactNode; onClose: () => void };
const PageLayers = createContext<{
  update: (id: string, content: ReactNode, onClose: () => void) => void;
  remove: (id: string) => void;
  clear: () => void;
} | null>(null);

/** Pages share the application's navigation bar; only the Plus menu is a sheet. */
export function PageLayersProvider({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const latest = useRef(layers);
  useEffect(() => {
    latest.current = layers;
  }, [layers]);
  const update = useCallback((id: string, content: ReactNode, onClose: () => void) => {
    setLayers((old) =>
      old.some((layer) => layer.id === id)
        ? old.map((layer) => (layer.id === id ? { id, content, onClose } : layer))
        : [...old, { id, content, onClose }],
    );
  }, []);
  const remove = useCallback((id: string) => {
    setLayers((old) => old.filter((layer) => layer.id !== id));
  }, []);
  const clear = useCallback(() => {
    latest.current
      .slice()
      .reverse()
      .forEach((layer) => layer.onClose());
    setLayers([]);
  }, []);
  const value = useMemo(() => ({ update, remove, clear }), [update, remove, clear]);
  useEffect(() => {
    if (!layers.length) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      layers.at(-1)?.onClose();
      return true;
    });
    return () => handler.remove();
  }, [layers]);
  return (
    <PageLayers.Provider value={value}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <View
            style={{ flex: 1 }}
            collapsable={false}
            accessibilityElementsHidden={layers.length > 0}
            importantForAccessibility={layers.length > 0 ? 'no-hide-descendants' : 'auto'}
          >
            {children}
          </View>
          {layers.map((layer, index) => (
            <View
              key={layer.id}
              collapsable={false}
              pointerEvents={index === layers.length - 1 ? 'auto' : 'none'}
              accessibilityElementsHidden={index !== layers.length - 1}
              importantForAccessibility={
                index === layers.length - 1 ? 'auto' : 'no-hide-descendants'
              }
              style={[StyleSheet.absoluteFill, { zIndex: index + 1 }]}
            >
              {layer.content}
            </View>
          ))}
        </View>
        {footer}
      </View>
    </PageLayers.Provider>
  );
}
export const usePageLayers = () => useContext(PageLayers);
