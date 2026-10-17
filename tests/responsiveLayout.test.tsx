import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { gridColumns, ResponsiveGrid } from '@/components/ui/ResponsiveGrid';

const originalWindow = Dimensions.get('window');
beforeEach(() => act(() => Dimensions.set({ window: { ...originalWindow, fontScale: 1 } })));
afterEach(() => act(() => Dimensions.set({ window: originalWindow })));

const widths = [320, 360, 390, 414, 600, 768, 820, 1024, 1280, 1440];

test.each(widths)('grid cells fit the measured container at %s logical pixels', (viewportWidth) => {
  const screen = render(
    <ResponsiveGrid>
      <Text>First card</Text>
      <Text>Second card</Text>
      <Text>Third card</Text>
    </ResponsiveGrid>,
  );
  const available = viewportWidth - 32;
  const container = screen.UNSAFE_getAllByType(View)[0]!;
  fireEvent(container, 'layout', {
    nativeEvent: { layout: { width: available, height: 300, x: 0, y: 0 } },
  });
  const columns = gridColumns(viewportWidth, 16);
  const cells = screen.UNSAFE_getAllByType(View).slice(1);
  expect(cells).toHaveLength(3);
  const cellWidth = StyleSheet.flatten(cells[0]!.props.style).width as number;
  expect(cellWidth).toBeGreaterThan(0);
  expect(cellWidth * columns + 12 * (columns - 1)).toBeCloseTo(available, 6);
  expect(columns).toBeLessThanOrEqual(3);
});

test('reflows existing cards when a tablet container becomes a narrow split-screen pane', () => {
  const screen = render(
    <ResponsiveGrid>
      <Text>One</Text>
      <Text>Two</Text>
      <Text>Three</Text>
    </ResponsiveGrid>,
  );
  const layout = (width: number) =>
    fireEvent(screen.UNSAFE_getAllByType(View)[0]!, 'layout', {
      nativeEvent: { layout: { width, height: 300, x: 0, y: 0 } },
    });
  layout(992);
  const wideCell = StyleSheet.flatten(screen.UNSAFE_getAllByType(View)[1]!.props.style).width;
  expect(wideCell).toBe(490);
  layout(328);
  const narrowCell = StyleSheet.flatten(screen.UNSAFE_getAllByType(View)[1]!.props.style).width;
  expect(narrowCell).toBe(328);
});

test('honors a two-column cap on a desktop-sized container', () => {
  const screen = render(
    <ResponsiveGrid maxColumns={2}>
      <Text>One</Text>
      <Text>Two</Text>
      <Text>Three</Text>
    </ResponsiveGrid>,
  );
  fireEvent(screen.UNSAFE_getAllByType(View)[0]!, 'layout', {
    nativeEvent: { layout: { width: 1408, height: 300, x: 0, y: 0 } },
  });
  expect(StyleSheet.flatten(screen.UNSAFE_getAllByType(View)[1]!.props.style).width).toBe(698);
});

test.each([1, 1.1, 1.2])('keeps existing tablet columns at default text scale %s', (fontScale) => {
  expect(gridColumns(1024, 16, fontScale)).toBe(2);
  expect(gridColumns(1440, 16, fontScale)).toBe(3);
});

test.each([320, 360, 393, 412, 430, 600, 768, 820, 1024, 1280, 1440])(
  'fits measured grid cells at %s px with 200%% text',
  (width) => {
    act(() => Dimensions.set({ window: { ...originalWindow, width, fontScale: 2 } }));
    const screen = render(
      <ResponsiveGrid>
        <Text>One</Text>
        <Text>Two</Text>
        <Text>Three</Text>
      </ResponsiveGrid>,
    );
    const available = width - 32;
    fireEvent(screen.UNSAFE_getAllByType(View)[0]!, 'layout', {
      nativeEvent: { layout: { width: available, height: 300, x: 0, y: 0 } },
    });
    const columns = gridColumns(width, 16, 2);
    const cell = StyleSheet.flatten(screen.UNSAFE_getAllByType(View)[1]!.props.style)
      .width as number;
    expect(cell * columns + 12 * (columns - 1)).toBeCloseTo(available, 6);
  },
);
