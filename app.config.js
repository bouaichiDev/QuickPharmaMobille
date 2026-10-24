module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
  const pushEnabled = process.env.EXPO_PUBLIC_PUSH_ENABLED === 'true';
  if (pushEnabled && !require('fs').existsSync(googleServicesFile)) {
    throw new Error(
      'Notifications activées : ajoutez google-services.json ou définissez GOOGLE_SERVICES_JSON avant le build.',
    );
  }
  const appEnv = process.env.APP_ENV || 'development';
  const isProduction = appEnv === 'production';

  const androidPackage =
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE ||
    (isProduction ? 'com.quickpharma.mobile' : 'com.quickpharma.mobile');

  return {
    ...config,

    name: isProduction ? 'QuickPharma' : 'QuickPharma',
    slug: 'quickpharma',
    scheme: 'quickpharma',
    version: config.version,
    orientation: 'default',

    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: androidPackage,
    },

    android: {
      ...config.android,
      ...(pushEnabled ? { googleServicesFile } : {}),
      package: androidPackage,
      blockedPermissions: [
        ...new Set([
          ...(config.android?.blockedPermissions || []),
          'android.permission.SYSTEM_ALERT_WINDOW',
        ]),
      ],
      versionCode: 1,
      predictiveBackGestureEnabled: false,
    },

    plugins: [
      ['expo-notifications', { color: '#01509d', defaultChannel: 'quickpharma-alerts' }],
      './plugins/withAndroidOptimization',
      ...(config.plugins || []).filter(
        (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== 'expo-build-properties',
      ),
      [
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            enablePngCrunchInReleaseBuilds: true,
            useLegacyPackaging: false,
            targetSdkVersion: 36,
            compileSdkVersion: 36,
          },
        },
      ],
    ],

    extra: {
      ...config.extra,
      appEnv,
      eas: {
        projectId: '9bacdd58-2136-47e1-9e74-c8e898683c00',
      },
    },
  };
};
