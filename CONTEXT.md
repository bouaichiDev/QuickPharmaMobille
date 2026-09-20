Tu es un développeur senior spécialisé en React Native, Expo, TypeScript, Laravel API et architecture SaaS multi-tenant.

Ta mission est de commencer la création de l’application mobile QuickPharma en te basant sur :

- Les interfaces générées par Stitch.
- Le code source du backend Laravel existant.
- Le code source de l’application Web existante.
- Les règles métier, plans, permissions, traductions et endpoints déjà disponibles.

CHEMINS DU PROJET

- Interfaces Stitch :
  `C:\Users\badz_\Desktop\Bureau\reactNative\MobileQuckPharma/stitch_quickpharma_logo_integration`

- Backend Laravel :
  C:\laragon\www\sassApi

- Frontend Web existant :
  C:\Users\badz\_\Desktop\Bureau\appreact\pharma-stock-nexus

- Application mobile à créer ou compléter :
  C:\Users\badz\_\Desktop\Bureau\reactNative\MobileQuckPharma

Commence par vérifier que ces chemins existent. Si un chemin est incorrect ou inaccessible, arrête-toi et indique précisément lequel doit être corrigé.

OBJECTIF

Créer une application mobile QuickPharma professionnelle sous React Native avec Expo et TypeScript.

L’application Mobile et l’application Web doivent utiliser :

- Le même backend Laravel.
- Les mêmes comptes utilisateurs.
- Les mêmes pharmacies et magasins.
- Les mêmes données métier.
- Les mêmes rôles et permissions.
- Les mêmes plans et abonnements.
- Les mêmes fonctionnalités autorisées.
- Le même système de traduction provenant du backend.

L’application mobile ne doit pas reproduire les règles métier dans le frontend. Laravel reste la source de vérité.

ÉTAPE 1 — ANALYSE OBLIGATOIRE

Avant d’écrire ou modifier du code :

1. Analyse complètement le dossier `stitch_quickpharma_logo_integration`.
2. Identifie :
   - Les écrans disponibles.
   - Les composants visuels réutilisables.
   - Les couleurs.
   - Les typographies.
   - Les espacements.
   - Les icônes.
   - Les images et logos.
   - Les variantes responsive.
   - Les états loading, empty, error et locked.

3. Analyse la structure du backend Laravel.
4. Analyse :
   - Les routes API.
   - Les contrôleurs.
   - Les Form Requests.
   - Les Resources.
   - Les Models et relations.
   - Le système d’authentification.
   - Les rôles et permissions.
   - Les plans et abonnements.
   - Les magasins.
   - Les traductions.
   - Les formats de réponse API.
   - La pagination.
   - La gestion des erreurs.

5. Analyse le frontend Web pour comprendre :
   - Les règles métier déjà utilisées.
   - Les menus disponibles.
   - Les permissions appliquées.
   - Les fonctionnalités par plan.
   - Les appels API.
   - Les filtres.
   - Les formulaires.
   - Les traductions.
   - Les statuts.

6. Ne considère pas le frontend Web comme source de vérité si son comportement contredit le backend.
7. Établis une correspondance entre :
   - Écrans Stitch.
   - Fonctionnalités Web.
   - Endpoints Laravel.
   - Permissions nécessaires.
   - Plans nécessaires.

À la fin de l’analyse, crée un rapport court contenant :

- Architecture détectée.
- Écrans Stitch disponibles.
- Endpoints réutilisables.
- Endpoints manquants.
- Incohérences détectées.
- Risques techniques.
- Plan d’implémentation par phases.

Ne commence l’implémentation qu’après avoir terminé cette analyse.

RÈGLES IMPORTANTES

- Ne modifie pas le backend Laravel pendant cette première mission.
- Ne modifie pas le frontend Web.
- Ne crée pas de faux endpoint.
- Ne remplace pas les données API par des données codées en dur.
- Ne duplique pas les règles métier du backend dans le mobile.
- Si un endpoint manque, documente-le dans `docs/mobile-api-gaps.md`.
- Si une modification backend est indispensable, propose-la séparément sans l’appliquer.
- Ne supprime aucun fichier existant sans justification.
- Préserve les modifications existantes du projet.
- N’utilise jamais directement du HTML Stitch dans React Native.
- Reproduis fidèlement le design Stitch avec des composants React Native.
- Le résultat doit fonctionner sur Android et rester compatible iOS.

STACK MOBILE

Utilise de préférence :

- React Native.
- Expo avec development build si nécessaire.
- TypeScript strict.
- Expo Router pour la navigation.
- TanStack Query pour les données serveur et le cache.
- Axios ou un client HTTP centralisé.
- React Hook Form.
- Zod pour la validation côté interface.
- Zustand uniquement pour l’état global réellement nécessaire.
- SecureStore pour les tokens sensibles.
- AsyncStorage pour les préférences non sensibles.
- Expo Localization.
- Une bibliothèque d’icônes compatible Expo.
- ESLint et Prettier.
- Tests unitaires pour les services critiques.

N’installe pas plusieurs bibliothèques qui remplissent le même rôle.

ARCHITECTURE ATTENDUE

Utilise une architecture modulaire, claire et facile à maintenir.

Exemple indicatif :

```text
src/
  app/
  components/
    ui/
    forms/
    feedback/
    navigation/
  features/
    auth/
    dashboard/
    subscriptions/
    notifications/
    profile/
    stores/
  services/
    api/
    auth/
    billing/
  hooks/
  providers/
  store/
  theme/
  i18n/
  types/
  utils/
  constants/
assets/
docs/
tests/
```

Évite les fichiers trop longs.

Principes :

- Un composant = une responsabilité principale.
- Séparer les écrans, composants, hooks, services et types.
- Aucun appel Axios directement dans les composants visuels.
- Aucun token stocké en clair.
- Aucun prix, plan, statut, rôle, permission ou menu métier codé en dur.
- Les fonctionnalités doivent être regroupées par domaine métier.
- Les types TypeScript doivent refléter les réponses réelles du backend.

DESIGN STITCH

Reproduis fidèlement les interfaces présentes dans :

`C:\Users\badz_\Desktop\Bureau\reactNative\MobileQuckPharma/stitch_quickpharma_logo_integration`

Crée un design system centralisé avec :

- Couleurs.
- Typographies.
- Espacements.
- Rayons des bordures.
- Ombres.
- Tailles des icônes.
- Boutons.
- Inputs.
- Cards.
- Badges.
- Modals.
- Bottom sheets.
- Skeletons.
- Empty states.
- Error states.
- Composant de fonctionnalité verrouillée.

Le logo doit provenir des assets Stitch. Ne recrée pas le logo et ne le remplace pas par du texte.

Évite les valeurs visuelles répétées directement dans les composants.

AUTHENTIFICATION

Réutilise le système d’authentification réel du backend Laravel.

Implémente :

- Splash screen.
- Restauration sécurisée de la session.
- Connexion.
- Création de compte si l’API existe.
- Mot de passe oublié si l’API existe.
- Déconnexion.
- Récupération du profil connecté.
- Gestion des tokens.
- Gestion des erreurs 401 et 403.
- Redirection selon l’état d’authentification.
- Nettoyage sécurisé de la session lors de la déconnexion.

Ne suppose pas le format d’authentification. Vérifie s’il s’agit de Laravel Sanctum, JWT ou d’un autre système et adapte l’implémentation.

TRADUCTIONS

Le backend contient déjà un système de traduction.

Implémente :

- Français.
- Arabe.
- Anglais.
- Espagnol.
- Support RTL complet pour l’arabe.
- Chargement des traductions depuis l’API.
- Cache local des traductions.
- Langue de secours si l’API est indisponible.
- Changement de langue depuis le profil.
- Aucun texte métier important dispersé directement dans les composants.

PLANS ET PERMISSIONS

Les plans, fonctionnalités, rôles et permissions viennent du backend.

Le mobile doit gérer séparément :

1. Permission utilisateur :
   l’utilisateur a-t-il le droit d’effectuer l’action ?

2. Fonctionnalité du plan :
   le plan actif contient-il cette fonctionnalité ?

3. Limite du plan :
   le nombre maximum d’utilisateurs, magasins ou autres ressources est-il atteint ?

Créer des composants ou hooks réutilisables, par exemple :

```ts
usePermission();
usePlanFeature();
useSubscription();
useCurrentStore();
```

Une protection visuelle ne suffit pas : les erreurs 403 et les limitations renvoyées par Laravel doivent également être traitées.

Lorsqu’une fonctionnalité est indisponible :

- Afficher un cadenas si cela correspond au design Stitch.
- Expliquer pourquoi l’accès est bloqué.
- Proposer la comparaison des plans uniquement au manager autorisé.
- Ne pas afficher un bouton d’achat à un employé sans permission.

GOOGLE PLAY SUBSCRIPTION

Prépare une architecture de paiement séparée et maintenable.

Le parcours attendu est :

```text
Utilisateur connecté
→ sélection du plan
→ achat Google Play
→ récupération du purchaseToken
→ envoi du token au backend Laravel
→ vérification serveur avec Google Play
→ activation de la subscription QuickPharma
→ rafraîchissement du profil et des fonctionnalités
→ accès Mobile et Web avec le même compte
```

Pour cette première phase :

- Prépare l’interface de choix des plans.
- Prépare le service mobile de billing.
- Prépare les types et contrats nécessaires.
- Ne simule pas une validation réelle en production.
- Ne stocke jamais une clé Google privée dans l’application.
- La vérification du `purchaseToken` doit être effectuée par Laravel.
- Si les endpoints de validation, restauration ou synchronisation n’existent pas, ajoute-les à `docs/mobile-api-gaps.md`.
- Prévoir les statuts : pending, purchased, active, cancelled, expired, grace period, paused et refunded.
- Prévoir « Restaurer mes achats ».
- Prévoir l’ouverture de la gestion des abonnements Google Play.

PREMIÈRE PHASE À IMPLÉMENTER

Implémente d’abord une base exécutable comprenant :

1. Initialisation du projet.
2. Configuration TypeScript stricte.
3. Variables d’environnement.
4. Design system extrait de Stitch.
5. Navigation principale.
6. Splash screen.
7. Onboarding.
8. Connexion.
9. Restauration de session.
10. Création de compte uniquement si les endpoints existent.
11. Sélection du magasin actif.
12. Dashboard connecté aux vraies API.
13. Centre de notifications si les endpoints existent.
14. Profil utilisateur.
15. Affichage du plan actif.
16. Liste dynamique des plans.
17. Écran de détail/comparaison des plans.
18. Préparation de Google Play Billing.
19. Gestion centralisée des permissions et fonctionnalités.
20. États loading, empty, offline, locked et error.
21. Support français et arabe RTL au minimum, avec structure prête pour anglais et espagnol.

DASHBOARD

Le dashboard doit utiliser uniquement les données réellement disponibles depuis l’API.

Afficher, selon les endpoints disponibles :

- Chiffre d’affaires du jour.
- Nombre de ventes.
- Produits vendus.
- Valeur du stock.
- Produits bientôt expirés.
- Produits expirés.
- Ruptures de stock.
- Stock faible.
- Paiements en attente.
- Activités récentes.
- Graphique des ventes.
- Actions rapides autorisées.

Si une donnée n’existe pas dans l’API, ne l’invente pas. Documente l’endpoint manquant.

GESTION DES MAGASINS

- Charger les magasins autorisés depuis l’API.
- Permettre au manager de changer le magasin actif.
- Stocker localement l’identifiant du dernier magasin choisi.
- Revalider l’accès au démarrage.
- Ajouter le magasin actif aux requêtes qui le nécessitent.
- Ne jamais permettre l’accès aux données d’un magasin non autorisé.

QUALITÉ ET SÉCURITÉ

- Utiliser HTTPS.
- Protéger les tokens avec SecureStore.
- Centraliser les erreurs API.
- Masquer les informations sensibles dans les logs.
- Gérer les timeouts.
- Gérer le mode hors connexion.
- Empêcher les doubles soumissions.
- Ajouter des confirmations pour les actions sensibles.
- Prévoir une configuration différente pour development, staging et production.
- Ne jamais inclure de secrets backend ou Google dans le dépôt mobile.
- Respecter les règles de sécurité multi-tenant.

TESTS ET VALIDATION

Après chaque bloc fonctionnel :

- Exécuter TypeScript.
- Exécuter ESLint.
- Exécuter les tests disponibles.
- Vérifier le démarrage Android.
- Vérifier les erreurs runtime.
- Comparer visuellement les écrans avec Stitch.
- Corriger les différences importantes.

Ajouter au minimum des tests pour :

- Restauration de session.
- Client API.
- Gestion des erreurs 401/403.
- Vérification des permissions.
- Vérification des fonctionnalités du plan.
- Mapping des plans.
- Changement de magasin actif.

LIVRABLES DE CETTE MISSION

À la fin, fournir :

1. Une application mobile exécutable.
2. La structure complète du projet.
3. Les premiers écrans connectés aux vraies API.
4. Le design system basé sur Stitch.
5. Un fichier `.env.example`.
6. Un fichier `README.md` avec les commandes d’installation et de lancement.
7. `docs/architecture.md`.
8. `docs/api-mapping.md`.
9. `docs/mobile-api-gaps.md`.
10. `docs/implementation-status.md`.
11. La liste des fichiers créés et modifiés.
12. Les résultats des tests et vérifications.
13. La liste claire de ce qui reste à développer.

MODE DE TRAVAIL

Travaille progressivement.

Commence par :

1. Inspecter les quatre chemins.
2. Présenter le rapport d’analyse.
3. Proposer le plan d’implémentation.
4. Initialiser ou corriger la base React Native.
5. Implémenter la première phase.
6. Tester réellement le projet.
7. Corriger les erreurs.
8. Fournir un état final précis.

Ne prétends jamais qu’une fonctionnalité fonctionne si elle n’a pas été testée.

Lorsque tu dois choisir entre inventer une donnée et documenter une API manquante, documente toujours l’API manquante.
