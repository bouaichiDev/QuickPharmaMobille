import { Children, isValidElement, useState, type ReactNode } from 'react';
import { FlatList, View, useWindowDimensions, type FlatListProps } from 'react-native';

const gap = 12;

export function gridColumns(width: number, padding = 0) {
  return width < 768 ? 1 : Math.min(3, Math.max(1, Math.floor((width - padding * 2 + gap) / 352)));
}

/** Measure the available container, including split-screen and orientation changes. */
export function ResponsiveGrid({
  children,
  maxColumns = 3,
}: {
  children: ReactNode;
  maxColumns?: number;
}) {
  const window = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const width = measuredWidth ?? Math.max(0, window.width - 32);
  const items = Children.toArray(children);
  const columns = Math.min(Math.max(1, items.length), maxColumns, gridColumns(width + 32, 16));
  const cellWidth = Math.max(0, (width - gap * (columns - 1)) / columns);
  return (
    <View
      onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {items.map((child, index) => (
        <View
          key={isValidElement(child) ? (child.key ?? index) : index}
          style={{ width: cellWidth, minWidth: 0 }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

/** Keep long lists virtualized; remount only the list when its column count changes. */
export function ResponsiveList<T>({
  renderItem,
  contentContainerStyle,
  onLayout,
  ...props
}: FlatListProps<T>) {
  const window = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const width = measuredWidth ?? window.width;
  const columns = gridColumns(width, 16);
  const cellWidth = Math.max(0, (width - 32 - gap * (columns - 1)) / columns);
  return (
    <FlatList
      {...props}
      key={`columns-${columns}`}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? { gap } : undefined}
      onLayout={(event) => {
        setMeasuredWidth(event.nativeEvent.layout.width);
        onLayout?.(event);
      }}
      contentContainerStyle={[
        contentContainerStyle,
        { width: '100%', maxWidth: undefined, paddingHorizontal: 16, gap },
      ]}
      renderItem={(info) => (
        <View style={{ flex: 1, minWidth: 0, maxWidth: cellWidth }}>{renderItem?.(info)}</View>
      )}
    />
  );
}
