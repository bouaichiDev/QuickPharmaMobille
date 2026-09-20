module.exports = ({ config }) => {
  const appEnv = process.env.APP_ENV || 'development';
  const isProduction = appEnv === 'production';

  const androidPackage =
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE ||
    (isProduction ? 'com.quickpharma.mobile' : 'com.quickpharma.mobile.dev');

  return {
    ...config,

    name: isProduction ? 'QuickPharma' : 'QuickPharma (Dev)',
    slug: 'quickpharma',
    scheme: 'quickpharma',
    version: '1.0.0',
    orientation: 'portrait',

    ios: {
      ...config.ios,
      supportsTablet: false,
      bundleIdentifier: androidPackage,
    },

    android: {
      ...config.android,
      package: androidPackage,
      versionCode: 1,
      predictiveBackGestureEnabled: false,
    },

    extra: {
      ...config.extra,
      appEnv,
      eas: {
        projectId: '9bacdd58-2136-47e1-9e74-c8e898683c00',
      },
    },
  };
};
