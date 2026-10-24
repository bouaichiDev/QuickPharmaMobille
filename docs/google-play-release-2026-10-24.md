# Google Play Android release — 24 October 2026

## Build identity

- Package: `com.quickpharma.mobile`
- Version: `1.0.3`, remote Android version code `11`
- EAS production build: `301736ce-014a-4db2-978c-74c1e48aec07`
- Build URL: https://expo.dev/accounts/bouaichibadr/projects/quickpharma/builds/301736ce-014a-4db2-978c-74c1e48aec07
- Production API: `https://appsassbk.quickpharmaapp.com/api`
- Existing EAS upload-signing key reused. No Google Play submission performed.

## Optimization configured and checked in generated Android project

- Explicit Android App Bundle production output; Google Play generates device-specific APKs.
- R8 release minification and optimized default ProGuard rules.
- Resource shrinking and optimized resource shrinking enabled.
- Release PNG crunching enabled; animated WebP support disabled.
- Hermes JavaScript engine enabled.
- Modern native-library packaging (`useLegacyPackaging=false`).
- Android compile/target API 36.
- Developer design-preview route excluded from EAS upload.
- Source upload measured 18.6 MB; this is not the installed app size.

## Automated checks completed before upload

- Expo SDK 57 dependency compatibility: Expo Doctor **21/21**.
- TypeScript passed.
- Source ESLint passed; targeted additional test lint has one nonblocking require-style warning.
- Jest **61 suites / 485 tests passed**.
- Reproducible package installation checked with npm ci dry run.
- Isolated Android prebuild succeeded; generated Gradle settings inspected.
- EAS source archive inspected: no private signing keys, Firebase admin credentials, credentials.json or local environment file. Required public Firebase Android client configuration included.
- Privacy URL returned HTTP 200: https://quickpharma.ma/politique-de-confidentialite
- Public account-deletion page returned HTTP 200: https://quickpharmaapp.com/account-deletion
- Production French translation API contains the 97 account-security keys.
- Android external subscription-payment links disabled. Subscription administration remains on the web.
- Compatible npm security fixes applied without forcing an Expo major-version change. No critical advisories remained at that check; other dependency/tooling advisories remain and this is not a security certification.

## Artifact checks

Build completed successfully. Artifact: `dist/google-play/QuickPharma-1.0.3-11.aab`, 87,109,294 bytes (83.07 MiB); this contains all supported architectures and is not the device download size.

- Google bundletool 1.18.3 validation passed.
- JAR signature verified; normal self-signed upload certificate / missing timestamp warnings. Certificate expiry reported 2054-02-05.
- Manifest confirms package, version 1.0.3/code 11, minimum API 24 and target API 36. Release application is not marked debuggable.
- Bundle configuration declares `PAGE_ALIGNMENT_16K`.
- All 54 arm64-v8a/x86_64 native libraries have compatible 16 KB ELF load-segment alignment. Runtime testing on a 16 KB device remains separate.
- No private credential files found. `expo-root.pem` is a public certificate, not a private key.
- Final permissions exclude microphone, system overlay, location and broad READ_MEDIA access. Legacy external storage is limited to API 32. Camera, notifications and supporting SDK permissions remain.
- SHA-256: `353F30994D3A816637576AA801F9063630ED379FB34416C54550AEBF9DD9495F`.

## Checks that require Google Play Console or a device

- A Samsung SM-G998N running Android 15/API 35 was connected and authorized. Installed QuickPharma is **1.0.2/code 10**, not this release. The user logged in directly; dashboard, stock and module-menu navigation responded. The older app still has unavailable modules, so this does not validate the new release screens. End-to-end UI, camera, push, TOTP and PDF tests on **1.0.3/code 11** remain outstanding.
- No authenticated production business operation was performed during this audit.
- Verify Data Safety answers against actual account, customer, pharmacy, document and notification data handling.
- Complete app access/reviewer account, content rating, target audience, health/financial feature declarations where applicable, privacy and deletion URLs in Play Console.
- Run Play internal testing and its pre-launch report before production rollout.
- Confirm upload key matches the existing Play application and that version code 11 is newer than its latest uploaded artifact.
- Google policy review and approval are separate from a successful build.

## Official references

- SDK: https://docs.expo.dev/versions/v57.0.0/
- App Bundle optimization: https://developer.android.com/guide/app-bundle
- App shrinking: https://developer.android.com/topic/performance/app-optimization/overview
- 16 KB compatibility: https://developer.android.com/guide/practices/page-sizes
- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Consumption-only subscriptions: https://support.google.com/googleplay/android-developer/answer/10281818
