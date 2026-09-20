# État d'avancement — phase 1

Date : 2026-09-16. Légende : ✅ fait et vérifié · 🟡 fait, vérifié partiellement · ⛔ bloqué par le backend · ⬜ non commencé.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `npm run typecheck` (TypeScript 6 strict) | ✅ 0 erreur |
| `npm run lint` (ESLint Expo + Prettier) | ✅ 0 problème |
| `npm test` (Jest) | ✅ 9 suites, 63 tests réussis |
| Parcours réel avec un compte **Admin** (magasin derluxpara), build natif, arabe RTL | ✅ connexion, restauration après fermeture forcée, dashboard pharmacie, alertes, graphique, activités récentes, notifications, profil, abonnement + quotas, permissions, plans, déconnexion confirmée |
| Bundle Android (Metro) | ✅ compilé sans erreur |
| Expo Go sur émulateur Android 15 (API 35) | ✅ onboarding, connexion, erreur 401 réelle, changement de langue |
| Development build natif (`expo run:android`) | ✅ BUILD SUCCESSFUL, app installée et lancée |
| RTL arabe dans le build natif | ✅ mise en page inversée après rechargement |
| API locale réelle (`php artisan serve`) | ✅ `/translations/fr/1` et `/2` 200, `/access/me` sans token 401, `/login` invalide 401 affiché dans l'app |
| iOS | ⬜ non testé (pas de macOS) ; aucun code spécifique Android hors billing |

## Fonctionnalités

| # | Élément | État | Remarques |
|---|---|---|---|
| 1 | Initialisation Expo SDK 57 / RN 0.86 | ✅ | |
| 2 | TypeScript strict | ✅ | `noUncheckedIndexedAccess`, `noImplicitReturns`… |
| 3 | Variables d'environnement dev / staging / prod | ✅ | `app.config.ts`, `.env.example`, HTTPS imposé hors dev |
| 4 | Design system extrait de Stitch | ✅ | couleurs, typo, espacements, rayons, ombres, composants |
| 5 | Navigation (Expo Router, onglets, garde auth) | ✅ | |
| 6 | Splash screen | ✅ | logo Stitch, attend polices + langue + session |
| 7 | Onboarding | ✅ | 3 écrans, affiché une fois |
| 8 | Connexion | ✅ | 401 / 403 suspendu / 429 verrouillage gérés, testé en 401 réel |
| 9 | Restauration de session | ✅ | testée avec un compte Admin réel (fermeture forcée puis réouverture) |
| 10 | Création de compte | 🟡 | endpoint réel + login automatique ; non exécutée pour ne pas écrire dans la base |
| 10b | Mot de passe oublié | 🟡 | réponse neutre ; lien final sur le web (pas de deep link) |
| 11 | Sélection du magasin actif | 🟡 | réservé à `team.users.view` / `team.stores.assign` (limite backend) ; compte testé mono-magasin : sélecteur masqué comme prévu, changement non testé |
| 12 | Dashboard connecté aux vraies API | ✅ | dashboard pharmacie testé (Admin) ; dashboards CRM / plateforme non testés (pas de compte) ; données manquantes documentées |
| 13 | Centre de notifications | ✅ | messages et compteurs réels testés ; « marquer comme lu » non exécuté pour ne pas modifier les données |
| 14 | Profil utilisateur | ✅ | identité, magasin, abonnement, quotas, permissions, langue, déconnexion testés |
| 15 | Plan actif | ✅ | « Free », échéance réelle |
| 16 | Liste dynamique des plans | ✅ | 4 plans réels, plan courant signalé, achat désactivé avec explication |
| 17 | Détail / comparaison des plans | 🟡 | écran compilé, non ouvert pendant le test |
| 18 | Préparation Google Play Billing | ⛔ | contrats, service, 8 statuts, restaurer, gérer sur Play ; achat désactivé : pas d'endpoint de vérification |
| 19 | Permissions / fonctionnalités / quotas centralisés | ✅ | `usePermission`, `usePlanFeature`, `useQuota`, `useSubscription`, `useCurrentStore`, `PermissionGate` ; 403/409 traités |
| 20 | États loading / empty / offline / locked / error | ✅ | skeletons, EmptyState, ErrorState, OfflineBanner, LockedFeature |
| 21 | Français + arabe RTL, structure en/es | ✅ | 4 langues locales + traductions backend + cache |

## Corrections issues des tests réels

| Problème observé | Cause | Correction |
|---|---|---|
| Déconnexion « fantôme » au redémarrage, plantages `current_page` / `seriesPaid` | L'adaptateur XHR d'axios sur Android perdait quelques caractères des grosses réponses (menus de `check-token`, dashboard, traductions) ; le JSON invalide était renvoyé en texte brut | Adaptateur `fetch` (`httpClient.ts`), avertissement en développement sur toute réponse non JSON, lecture défensive des notifications, du graphique et des traductions |
| Textes arabes coupés (« هذا الشهر » → « هذا ») | `writingDirection: 'auto'` fausse la mesure du texte sur Android en RTL ; polices latines sans glyphes arabes | Suppression de `writingDirection`, police système pour l'arabe (`fontForScript`) |
| « 2 / 1 » affiché « 1 / 2 » en arabe | algorithme bidirectionnel | valeur isolée en LTR (U+2066 / U+2069) |
| Redirection vers la connexion pendant la restauration de session | layouts redirigeaient pendant l'état `booting` | aucun rendu tant que la session n'est pas restaurée |
| Avertissements `ProgressBarAndroid`, `Clipboard`… | `import('react-native')` dynamique | import statique de `DevSettings` |

## Points d'attention

- **Déconnexion** : le backend révoque tous les tokens (Web inclus). Correctif proposé dans `backend-proposals.md` §1, non appliqué.
- **Windows** : le build natif dépasse la limite de 260 caractères depuis `C:\Users\badz_\Desktop\Bureau\reactNative\MobileQuckPharma`. Solutions : activer `LongPathsEnabled` (administrateur) ou compiler depuis un lecteur court (`subst Q: C:\Users\badz_\Desktop\Bureau\reactNative` puis `Q:\MobileQuckPharma`).
- **Node** : la machine a Node 22.12 ; Expo SDK 57 demande 22.13+. Tout a fonctionné, mais une mise à jour est recommandée.
- **Expo Go** : ne gère pas le RTL en SDK 57 ; utiliser le development build.
- Le dossier `android/` est généré (Continuous Native Generation) et ignoré par git.

## Reste à développer

1. **Backend (prérequis)** : vérification Google Play + RTDN, token par appareil, `GET /me`, `GET /me/stores`, `GET /dashboard/today`, enregistrement des tokens push (voir `mobile-api-gaps.md`).
2. Tests de bout en bout avec des comptes de chaque rôle (Admin, vendeur, serviceCRM, SuperAdmin) et un employé multi-magasins.
3. Module natif Google Play Billing (dev build) une fois le backend prêt ; tests en piste interne Play Console.
4. Écrans métier absents de Stitch et de cette phase : stock, ventes / POS, scanner, entrées de stock, clients, ordonnances.
5. Notifications push, biométrie, changement de mot de passe connecté (endpoints manquants).
6. Mode sombre (non défini dans Stitch), tests de composants et d'intégration (React Native Testing Library, Maestro).
7. Configuration EAS Build (profils development / preview / production) et signature Android.
8. Vérification iOS sur macOS.
