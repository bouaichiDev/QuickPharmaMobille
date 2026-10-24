import { Linking, Platform } from 'react-native';

jest.mock('@/constants/config', () => ({ config: { webAppUrl: 'https://quickpharmaapp.com' } }));

describe('Google Play subscription navigation', () => {
  const initial = Platform.OS;
  afterEach(() => { Object.defineProperty(Platform, 'OS', { value: initial, configurable: true }); jest.restoreAllMocks(); jest.resetModules(); });

  it('never opens the external subscription site on Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { webAppAvailable, openWebApp } = require('@/features/subscriptions/openWebApp');
    expect(webAppAvailable).toBe(false);
    await openWebApp();
    expect(open).not.toHaveBeenCalled();
  });
});
