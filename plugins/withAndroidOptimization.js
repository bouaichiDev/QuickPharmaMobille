const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

// Persist release optimization through every EAS prebuild, without changing the
// Android Gradle Plugin version supplied by the supported React Native SDK.
module.exports = (config) => {
  config = withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter(
      (entry) => entry.key !== 'android.r8.optimizedResourceShrinking',
    );
    mod.modResults.push({
      type: 'property',
      key: 'android.r8.optimizedResourceShrinking',
      value: 'true',
    });
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    const old = 'getDefaultProguardFile("proguard-android.txt")';
    const optimized = 'getDefaultProguardFile("proguard-android-optimize.txt")';
    if (!mod.modResults.contents.includes(old) && !mod.modResults.contents.includes(optimized)) {
      throw new Error('Android release ProGuard defaults changed; review the optimization plugin.');
    }
    mod.modResults.contents = mod.modResults.contents.replace(old, optimized);
    return mod;
  });
};
