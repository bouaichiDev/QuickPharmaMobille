# Architecture — QuickPharma Mobile

## Principes

- **Laravel est la source de vérité.** Permissions, fonctionnalités de plan, quotas, abonnement, menus, magasins autorisés et libellés viennent de l'API. Le mobile ne fait que lire `GET /access/me` (même logique que `pharma-stock-nexus/src/access/utils/decision.ts`).
- **Aucun appel HTTP dans les composants visuels** : règle ESLint `no-restricted-imports` sur `axios` dans `src/components` et `src/app`.
- **Aucune donnée métier inventée** : ce qui manque est documenté dans `docs/mobile-api-gaps.md`.
- Un composant = une responsabilité ; les routes Expo Router ne font que réexporter des écrans de `features/*/screens`.

## Stack

| Rôle | Choix |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19.2 |
| Langage | TypeScript 6 strict (`noUncheckedIndexedAccess`, `noImplicitReturns`…) |
| Navigation | Expo Router (`src/app`, routes typées) |
| Données serveur | TanStack Query 5 (cache, retry, pagination infinie, pause hors ligne) |
| HTTP | Axios, instance unique `src/services/api/client.ts` |
| Formulaires | React Hook Form + Zod 4 |
| État global | Zustand : **session** et **langue** uniquement |
| Secrets | `expo-secure-store` (token + magasin actif) |
| Préférences | AsyncStorage (langue, onboarding, cache de traductions, email mémorisé) |
| i18n | Traductions backend + textes locaux fr/ar/en/es, RTL via `I18nManager` |
| Icônes / polices | `@expo/vector-icons` (MaterialIcons), Plus Jakarta Sans + Inter |
| Qualité | ESLint (`eslint-config-expo` + Prettier), Jest (`jest-expo`) |

## Arborescence

```text
src/
  app/                      Routes Expo Router (fichiers fins)
    _layout.tsx             Polices, splash, providers, restauration de session
    index.tsx               Redirection selon l'état (onboarding / login / home)
    onboarding.tsx
    (auth)/                 login, register, forgot-password (redirige si connecté)
    (app)/                  Zone connectée (redirige si anonyme)
      _layout.tsx           StoreAccessGuard + bannière hors ligne + Stack
      (tabs)/               home (dashboard), notifications, more (profil)
      plans/                index, [id]
  components/
    ui/                     Design system : AppText, Button, TextField, Card, Badge, Chip,
                            Skeleton, BottomSheet, ConfirmDialog, ListRow, Screen, Logo…
    feedback/               EmptyState, ErrorState, InlineNotice, OfflineBanner, LockedFeature
    navigation/             AppHeader
  features/
    auth/                   api, session (service + store), schémas Zod, écrans
    access/                 /access/me, décisions, hooks, PermissionGate
    stores/                 liste des magasins, sélection, garde d'accès, en-tête
    dashboard/              api, choix du dashboard par rôle, widgets, écran
    notifications/          messages + alertes, écran
    profile/                profil, abonnement, permissions, langue, déconnexion
    subscriptions/          plans (mapping), billing hooks, écrans
    settings/               GetSettings (devise)
    onboarding/
  services/
    api/                    client, erreurs normalisées, endpoints
    billing/                contrats Google Play, provider, backend, orchestrateur
    storage/                secureStorage, preferences
  i18n/                     locales, traducteur, store, RTL, service de traductions
  providers/                QueryClient, AppProviders, bootstrap, contexte onboarding
  hooks/                    useNetworkStatus
  theme/                    couleurs, typographie, espacements, rayons, ombres
  types/                    api.ts, access.ts (contrat backend)
  utils/                    format, logger (redaction), messages d'erreur
  constants/                config (env), clés de stockage
tests/                      tests unitaires Jest
docs/
```

## Flux principaux

### Démarrage

```text
Splash natif (logo Stitch)
 → polices + langue (AsyncStorage / appareil) + cache de traductions
 → session SecureStore → GET /auth/check-token
     200 : session rafraîchie (rôle, default_route, magasin par défaut)
     401 : purge → connexion
     réseau/5xx : session conservée « non vérifiée »
 → onboarding (1re fois) | connexion | dashboard
```

### Requête API

```text
écran → hook feature (TanStack Query) → api module → httpClient
  intercepteur requête : Accept, Bearer, Accept-Language, store_id + lang
  intercepteur réponse : normalizeApiError
    401 → sessionStore.signOut(sessionExpired)
    403/409 + code → invalidation de ['access','me'] (anti-rafale 3 s)
```

### Permissions, fonctionnalités, quotas

```text
useAccess()            GET /access/me?store_id  (rafraîchi selon valid_until, 30 s – 10 min, et au retour au premier plan)
usePermission(p)       1. droit du rôle (+ restrictions plan/magasin)
usePlanFeature(f)      2. fonctionnalité incluse dans le plan / essai / dérogation
useQuota(q)            3. limite : not_configured | unlimited | limited(exceeded)
useSubscription()      abonnement actif
useCurrentStore()      magasin actif, liste, changement
<PermissionGate>       cadenas + raison ; « Voir les plans » seulement si subscription.manage
```

La protection visuelle ne remplace pas l'API : chaque 403/409 est traité et affiché.

### Magasin actif

- Magasin par défaut = celui renvoyé par `/login`.
- Changement possible si `team.users.view` ou `team.stores.assign` et au moins 2 magasins (`/users/getUserStores`).
- Le choix est stocké dans SecureStore avec la session, le cache TanStack est vidé à chaque changement.
- Revalidation : `/access/me` au démarrage et après changement ; `STORE_ACCESS_DENIED` → retour au magasin par défaut, ou écran bloquant si le magasin par défaut est refusé/suspendu.

### Traductions

Ordre de résolution d'une clé : **backend** (`/translations/{lang}/2` + `access` de `/1`) → texte local de la langue → français local → clé brute. Les textes locaux sont sous `mobile.*` : l'équipe peut les surcharger depuis l'admin des traductions web avec la même clé. Passage arabe ↔ langue LTR : `I18nManager.forceRTL` + rechargement (`expo-updates`).

### Google Play Billing

```text
PlansScreen → useSubscribe → billingService.subscribe(plan, store)
  availability(): Android ? module natif ? provider_product_id ? backend de vérification ?
  → BillingUnavailableError(reasons) tant qu'un élément manque (cas actuel)
  → provider.purchaseSubscription → purchaseToken
  → billingBackend.verifyPurchase (Laravel ↔ Google Play) → abonnement vérifié
  → invalidation de /access/me
```

Aucune clé Google dans l'app ; aucune validation locale.

## Sécurité

- Token et magasin actif chiffrés par le keystore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`).
- Logger avec masquage (`token`, `password`, `authorization`, `store_id`, `user_id`, `email`) ; logs debug seulement en `__DEV__`.
- HTTPS obligatoire hors `development` (`getConfigErrors`) ; timeout configurable.
- Boutons en chargement désactivés (pas de double soumission) ; confirmation avant déconnexion.
- Variantes `development` / `staging` / `production` via `APP_ENV` (`app.config.ts`) : identifiant d'application distinct par variante.
