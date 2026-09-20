# Correspondance écrans ↔ API Laravel

Base : `EXPO_PUBLIC_API_BASE_URL` (ex. `http://10.0.2.2:8000/api`). Toutes les requêtes envoient `Accept: application/json`, `Accept-Language` et `Authorization: Bearer <token Sanctum>` (sauf routes publiques). `store_id` (chiffré, tel que renvoyé par l'API) et `lang` sont ajoutés **en query pour GET/DELETE et dans le corps pour POST/PUT/PATCH** par `src/services/api/httpClient.ts`.

Référence backend : `sassApi/docs/access-control/{api-contract.md, matrix.md, openapi.yaml, types.ts}`.

## Écrans

| Écran mobile | Écran Stitch | Fonctionnalité Web équivalente | Endpoints | Permission (matrice backend) | Plan / quota |
|---|---|---|---|---|---|
| Splash / restauration | — | `AuthContext` | `GET /auth/check-token` | authentifié | — |
| Onboarding | — | — | aucun | — | — |
| Connexion | `connexion_quickpharma` | `pages/Login.tsx` | `POST /login` | public (throttle `login`) | — |
| Inscription | `inscription_quickpharma` | `pages/Signup.tsx` | `POST /register` puis `POST /login` | public | plan gratuit `signup_default` créé par le backend |
| Mot de passe oublié | — (lien Stitch) | `ForgotPassword.tsx` | `POST /forgot-password` | public | — |
| Traductions (global) | — | `TranslationContext` | `GET /translations/{lang}/2` + `/1` (sous-arbre `access`) | public | — |
| Droits (global) | — | `access/AccessProvider.tsx` | `GET /access/me` | `self` | renvoie features, quotas, essais, restrictions |
| En-tête / changement de magasin | header Stitch | `MainLayout` sélecteur | `GET /users/getUserStores?userid=<chiffré>` | `team.users.view` **ou** `team.stores.assign` | — |
| Dashboard pharmacie | `tableau_de_bord_quickpharma` | `pages/Dashboard.tsx` | `GET /dashboard?year&month` | `dashboard.view` (montants ventes : `sales.view`, achats : `entries.view`) | — |
| Alertes du dashboard | bloc « Alertes Stocks & Lots » | `pages/alerts/dashboard` | `GET /alerts/dashboard` | `self` + policy `viewAny` | — |
| Dashboard CRM (rôle `/services-crm`) | — | `pages/services-crm/dashboard` | `GET /crm-reports/dashboard` | `services.sessions.view` | fonctionnalité `services.crm` |
| Dashboard SuperAdmin | — | `pages/superadmin/dashboard` | non utilisé sur mobile (message dédié) | `platform.metrics.view` | — |
| Devise | — | `SettingsContext` | `GET /GetSettings` → `Currency` (**absent en pratique** : montants affichés sans symbole, voir gaps §9) | public | — |
| Notifications — messages | `notifications_alertes_quickpharma` | `NotificationContext` | `GET /showNotifications?id&page&per_page`, `POST /notifications/read/{id}`, `GET /notifications/clear?for` | `self` | — |
| Notifications — alertes | idem (cartes rupture/péremption) | `pages/alerts` | `GET /alerts`, `POST /alerts/{uid}/read`, `POST /alerts/read-all` | `self` + policies | — |
| Profil | `profil_abonnement_quickpharma` | `pages/Profile.tsx` | `GET /users/show/0`, `GET /access/me` | `self_param id=0` | quotas affichés depuis `/access/me` |
| Langue | profil (sélecteur) | `TranslationContext` | `GET /translations/{lang}/…` | public | — |
| Déconnexion | profil (« Déconnexion sécurisée ») | `AuthContext.logout` | `POST /logout` | authentifié | — |
| Plans | `abonnements_plans_quickpharma` | `pages/plans/PlanSelection.tsx` | `GET /plans`, plan courant via `/access/me.subscription.plan_id` | écran : `subscription.view` ou `subscription.manage` ; achat : `subscription.manage` | — |
| Détail / comparaison | — | — | `GET /plans` (comparaison construite depuis la liste) | idem | — |
| Achat Google Play | bouton « Souscrire via Google Play » | — (web : paiement manuel) | **manquant** — voir `mobile-api-gaps.md` §1 | `subscription.manage` | — |
| Gérer sur Google Play | profil | — | aucun (lien `play.google.com/store/account/subscriptions`) | `subscription.manage` | — |

## Choix du dashboard par rôle

Chaque rôle possède `roles.default_route` (renvoyé par `/login` et `/auth/check-token`). `src/features/dashboard/resolveDashboardKind.ts` :

1. `/superadmin/*` ou `subscription.terms = platform` → espace plateforme (Web uniquement).
2. `/services-crm*` et `services.sessions.view` → dashboard CRM.
3. `dashboard.view` → dashboard pharmacie.
4. `services.sessions.view` → dashboard CRM.
5. Sinon → état « aucun tableau de bord ».

## Gestion des erreurs

| Réponse | Traitement mobile |
|---|---|
| 401 (token présent) | purge SecureStore + cache, retour à la connexion avec « session expirée » |
| 401 sur `/login` | « Email ou mot de passe incorrect » |
| 403 `/login` magasin suspendu | message dédié |
| 429 `/login` | verrouillage, minutes depuis `Retry-After` |
| 403/409 avec `code` d'accès | message `access.errors.<code>` (backend) ou texte local ; rechargement de `/access/me` (max 1 fois / 3 s) |
| 403 `STORE_ACCESS_DENIED` sur `/access/me` | magasin choisi → retour au magasin par défaut ; magasin par défaut → écran bloquant |
| 422 / 400 / 404 avec champs | erreurs replacées sur les champs du formulaire |
| réseau / timeout | état hors connexion, requêtes en pause (NetInfo + `onlineManager`) |
| 5xx | état d'erreur avec « Réessayer » |
