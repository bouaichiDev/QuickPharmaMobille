import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';
import { gridColumns, ResponsiveGrid } from '@/components/ui/ResponsiveGrid';

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
