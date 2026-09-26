import { Linking } from 'react-native';

import { config } from '@/constants/config';

/** Payments and plan changes happen on the web app only. */
export const webAppAvailable = config.webAppUrl.length > 0;

export async function openWebApp(): Promise<void> {
  if (!webAppAvailable) return;
  await Linking.openURL(config.webAppUrl);
}
