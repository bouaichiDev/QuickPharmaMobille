import { Linking, Platform } from 'react-native';

import { config } from '@/constants/config';

/** Payments and plan changes happen on the web app only. */
export const webAppAvailable = Platform.OS !== 'android' && config.webAppUrl.length > 0;

export async function openWebApp(): Promise<void> {
  if (!webAppAvailable) return;
  await Linking.openURL(config.webAppUrl);
}
