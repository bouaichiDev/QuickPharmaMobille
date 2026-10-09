/* eslint-disable @typescript-eslint/no-require-imports */
import { useState } from 'react';
import { Button, Text, View, Modal } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PageLayersProvider, usePageLayers } from '@/features/navigation/PageLayers';
import { CrmPage } from '@/features/crm/components/CrmDesign';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('@/components/ui/AppText', () => ({ AppText: require('react-native').Text }));
jest.mock('expo-router/react-navigation', () => ({
  NavigationContext: require('react').createContext(undefined),
  NavigationRouteContext: require('react').createContext(undefined),
}));
jest.mock('@/components/ui/Icon', () => ({ Icon: () => null }));

function Pages() {
  const [form, setForm] = useState(false);
  const [preview, setPreview] = useState(false);
  return (
    <View>
      <Button title="Ouvrir formulaire" onPress={() => setForm(true)} />
      <CrmPage visible={form} title="Formulaire" onClose={() => setForm(false)}>
        <Text>Champs du formulaire</Text>
        <Button title="Aperçu" onPress={() => setPreview(true)} />
        <CrmPage visible={preview} title="Impression" onClose={() => setPreview(false)}>
          <Text>Document</Text>
        </CrmPage>
      </CrmPage>
    </View>
  );
}
describe('Persistent navigation and normal CRM pages', () => {
  it('keeps the bottom navigation while opening and closing nested pages', async () => {
    const rendered = render(
      <PageLayersProvider footer={<Text>Navigation du bas</Text>}>
        <Pages />
      </PageLayersProvider>,
    );
    fireEvent.press(screen.getByText('Ouvrir formulaire'));
    expect(rendered.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.getByText('Navigation du bas')).toBeTruthy();
    fireEvent.press(screen.getByText('Aperçu'));
    expect(screen.getByText('Document')).toBeTruthy();
    expect(screen.getByText('Navigation du bas')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Retour'));
    expect(screen.queryByText('Document')).toBeNull();
    expect(screen.getByText('Champs du formulaire')).toBeTruthy();
  });
  it('closes all transient pages before switching navigation section', async () => {
    function Navigation() {
      const pages = usePageLayers();
      return <Button title="Navigation" onPress={() => pages?.clear()} />;
    }
    render(
      <PageLayersProvider footer={<Navigation />}>
        <Pages />
      </PageLayersProvider>,
    );
    fireEvent.press(screen.getByText('Ouvrir formulaire'));
    fireEvent.press(screen.getByText('Aperçu'));
    fireEvent.press(screen.getByText('Navigation'));
    expect(screen.queryByText('Document')).toBeNull();
    expect(screen.queryByText('Champs du formulaire')).toBeNull();
    expect(screen.getByText('Ouvrir formulaire')).toBeTruthy();
  });
});
