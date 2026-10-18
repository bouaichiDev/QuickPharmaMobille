import { Text, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchFilterRow } from '@/components/ui/SearchFilterRow';
import { Screen } from '@/components/ui/Screen';
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ landscape: false, needsReflow: false }),
}));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
it('aligns the filter button to the input below the search label and keeps both actions working', () => {
  const change = jest.fn(),
    filter = jest.fn();
  render(
    <SearchFilterRow label="Rechercher" value="" onChangeText={change} onFilterPress={filter} />,
  );
  expect(StyleSheet.flatten(screen.getByTestId('search-filter-row').props.style).alignItems).toBe(
    'flex-end',
  );
  const button = screen.getByRole('button', { name: 'Filtres' });
  expect(StyleSheet.flatten(button.props.style).minHeight).toBe(48);
  fireEvent.changeText(screen.getByLabelText('Rechercher'), 'ENT-1');
  fireEvent.press(button);
  expect(change).toHaveBeenCalledWith('ENT-1');
  expect(filter).toHaveBeenCalledTimes(1);
});
it('does not reserve a scrolling bottom spacer underneath full-screen lists', () => {
  render(
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <Text>Liste</Text>
    </Screen>,
  );
  const style = StyleSheet.flatten(screen.getByTestId('screen-static-content').props.style);
  expect(style.padding).toBe(0);
  expect(style.paddingBottom).toBeUndefined();
});
it('keeps comfortable bottom padding inside scrolling forms', () => {
  render(
    <Screen>
      <Text>Formulaire</Text>
    </Screen>,
  );
  const style = StyleSheet.flatten(
    screen.getByTestId('screen-scroll-content').props.contentContainerStyle,
  );
  expect(style.paddingBottom).toBeGreaterThan(0);
});
