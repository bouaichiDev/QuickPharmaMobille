# QuickPharma Mobile

Application mobile QuickPharma (Android, compatible iOS) en React Native / Expo / TypeScript.
Elle utilise **le même backend Laravel** (`sassApi`) que l'application Web : mêmes comptes, magasins, rôles, permissions, plans et traductions. Laravel reste la source de vérité.

- Architecture : [docs/architecture.md](docs/architecture.md)
- Écrans ↔ endpoints : [docs/api-mapping.md](docs/api-mapping.md)
- Endpoints manquants : [docs/mobile-api-gaps.md](docs/mobile-api-gaps.md)
- Propositions backend (non appliquées) : [docs/backend-proposals.md](docs/backend-proposals.md)
- État d'avancement : [docs/implementation-status.md](docs/implementation-status.md)
- Maquettes : `stitch_quickpharma_logo_integration/`

## Prérequis

| Outil | Version |
|---|---|
| Node.js | **22.13 ou plus** (exigence Expo SDK 57) |
| npm | 10+ |
| JDK | 17 (build Android natif) |
| Android SDK | API 36, un émulateur ou un appareil |
| Backend | `sassApi` démarré (`php artisan serve`) avec sa base MySQL |

> N'utilisez pas l'ancien `expo-cli` global : les commandes passent par `npx expo` (CLI locale).

## Installation

```bash
npm install
cp .env.example .env.local   # puis adapter EXPO_PUBLIC_API_BASE_URL
```

URL de l'API selon la cible :

| Cible | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| Émulateur Android → backend local | `http://10.0.2.2:8000/api` |
| Appareil physique (même Wi-Fi) | `http://<IP-du-PC>:8000/api` (lancer `php artisan serve --host=0.0.0.0`) |
| Staging / production | `https://…/api` (HTTPS obligatoire) |

## Lancement

Backend :

```bash
cd C:\laragon\www\sassApi
php artisan serve --host=127.0.0.1 --port=8000
```

Application — **development build** (recommandé : nécessaire pour le RTL arabe et, plus tard, Google Play Billing) :

```bash
npx expo run:android          # compile, installe et lance l'app
# ensuite, pour les sessions suivantes :
npx expo start --dev-client
```

Application — **Expo Go** (aperçu rapide, sans RTL) :

```bash
npx expo start
# puis « a » pour Android
```

## Environnements

`APP_ENV` sélectionne la variante (`app.config.ts`) :

| APP_ENV | Nom | Identifiant Android |
|---|---|---|
| `development` (défaut) | QuickPharma (Dev) | `com.quickpharma.mobile.dev` |
| `staging` | QuickPharma (Staging) | `com.quickpharma.mobile.staging` |
| `production` | QuickPharma | `com.quickpharma.mobile` |

Seules les variables `EXPO_PUBLIC_*` sont embarquées dans l'app. **Aucun secret backend ou clé Google ne doit y figurer.**

## Scripts

| Commande | Rôle |
|---|---|
| `npm run typecheck` | TypeScript strict (`tsc --noEmit`) |
| `npm run lint` | ESLint (Expo + Prettier) |
| `npm test` | Tests unitaires Jest |
| `npm run verify` | Les trois à la suite |
| `npm run format` | Prettier sur `src/` et `tests/` |

## Structure

```text
src/app          routes Expo Router
src/components   design system (ui), états (feedback), navigation
src/features     auth, access, stores, dashboard, notifications, profile, subscriptions, settings, onboarding
src/services     client API, billing Google Play, stockage
src/i18n         fr / ar / en / es + traductions backend + RTL
src/theme        tokens extraits de Stitch
tests/           tests unitaires
docs/            documentation
```
