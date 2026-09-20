# Endpoints manquants et limites de l'API pour le mobile

Ce document liste ce que l'application mobile **ne peut pas faire proprement** avec le backend actuel (`sassApi`). Aucun de ces points n'a été contourné par des données inventées ou un faux endpoint. Les correctifs backend proposés sont détaillés dans [backend-proposals.md](backend-proposals.md) ; rien n'a été appliqué.

Priorité : **P1** bloque une fonctionnalité prévue, **P2** dégrade l'expérience ou la sécurité, **P3** confort.

## 1. Paiement Google Play (P1)

Aucune intégration Google Play n'existe côté Laravel (ni `purchaseToken`, ni Play Developer API, ni notifications RTDN). `POST /subscriptions/payment` est un placeholder et l'activation des plans payants passe par une validation manuelle SuperAdmin (`POST /subscription-billings/{id}/validate`).

L'écran des plans affiche donc les plans réels mais **l'achat est désactivé** (`BillingUnavailableError`, raison `BACKEND_VERIFICATION_MISSING`).

Endpoints attendus (contrat déjà typé côté mobile dans `src/services/billing/types.ts`) :

| Méthode | Route proposée | Rôle | Corps / réponse |
|---|---|---|---|
| POST | `/billing/google-play/verify` | `subscription.manage` | `{ store_id, plan_id, product_id, purchase_token, package_name }` → `{ subscription_id, plan_id, status, expires_at, auto_renewing }` |
| POST | `/billing/google-play/restore` | `subscription.manage` | `{ store_id, purchases: [{ product_id, purchase_token }] }` → liste d'abonnements vérifiés |
| GET | `/billing/google-play/status` | `subscription.view` | État synchronisé de l'abonnement Play du compte |
| POST | `/billing/google-play/rtdn` | public, signé (Pub/Sub) | Real-time Developer Notifications (renouvellement, annulation, grâce, pause, remboursement) |

Prérequis backend :
- `plans.provider_product_id` renseigné avec l'id produit / base plan Google Play (champ existant, vide aujourd'hui).
- Statuts d'abonnement : la table `statuses` (`src = subscription`) ne contient que `active`, `pending`, `expired`, `cancelled`, `incomplete`. Il manque `grace_period`, `paused`, `refunded` (et éventuellement `purchased`).
- Clé du compte de service Google **uniquement sur le serveur**.
- Idempotence sur `purchase_token` (un même jeton ne doit jamais activer deux abonnements).

## 2. Tableau de bord (P2)

`GET /dashboard` ne filtre que par année/mois. Le design Stitch montre des données absentes :

| Donnée Stitch | Disponible ? | Ce que fait le mobile |
|---|---|---|
| Chiffre d'affaires **du jour** | Non (mois/année seulement) | Affiche le CA encaissé du mois / mois précédent / année |
| Nombre de ventes de la période | Partiel : `CountSales` est toujours **annuel** | Affiché avec le libellé « sur l'année » |
| Produits vendus (unités) | Non | Non affiché |
| Valeur du stock | Non | Non affiché (on affiche `productsCount` et `unitsAvailable`) |
| Produits bientôt expirés / expirés séparés | Non dans `/dashboard` (`expiredCount` mélange ≤ 7 j et expirés) | Utilise `GET /alerts/dashboard` → `by_type.product_expiring` / `product_expired` ; repli sur le compteur mélangé si les alertes sont refusées |
| Ruptures / stock faible séparés | Non dans `/dashboard` (`outOfStockCount` mélange) | Idem via `by_type.stock_out` / `stock_low` |
| Fréquentation par heure (courbe) | Non (seulement `performance.peakHour`) | Graphique mensuel ventes/achats payés + heure de pointe |
| Paiements en attente | Partiel : `totalSalesUnpaid` (montant) | Affiché en montant |

Endpoint proposé : `GET /dashboard/today?store_id=` → `{ revenue_today, sales_count_today, units_sold_today, stock_value, expiring_soon_count, expired_count, low_stock_count, out_of_stock_count, pending_payments_count, hourly_sales: [{hour, count, amount}] }`, montants en nombres (pas de `number_format`).

Autres remarques :
- Les montants sont renvoyés en **chaînes** formatées (`"2840"`), sans décimales.
- Les compteurs d'alertes dépendent de l'exécution des crons `alerts:stock|expiry` : sans cron, `/alerts/dashboard` renvoie 0.

## 3. Profil « me » et compte (P2)

| Besoin | Situation | Proposition |
|---|---|---|
| Profil courant en un appel | Il faut combiner `GET /auth/check-token`, `GET /access/me` et `GET /users/show/0` (qui exige `store_id`) | `GET /me` → `{ id, first_name, last_name, email, phone, avatar_url, role, default_route, language }` |
| Changer son mot de passe connecté | Inexistant (`/users/reset` ne sert qu'aux comptes `initialise`) | `POST /me/password` `{ current_password, password, password_confirmation }` |
| Préférence de langue | `/changeLanguage` écrit en session (inopérant avec un token) | `PUT /me/preferences` `{ language }` |
| Photo de profil | `users.image` = nom de fichier, pas d'URL | Renvoyer une URL signée |

## 4. Magasins (P2)

- **Employés** : `GET /users/getUserStores` exige `team.users.view` ou `team.stores.assign`. `GET /userStores` est accessible à tous mais renvoie des ids **en clair**, refusés comme `store_id`. Un employé rattaché à plusieurs magasins ne peut donc pas changer de magasin sur mobile.
- **Identité stable** : les ids chiffrés changent à chaque réponse (IV aléatoire). Le mobile ne peut reconnaître « le magasin actuel » dans la liste que par son **nom**.
- Proposition : `GET /me/stores` → `[{ id: <chiffré>, key: <identifiant public stable>, name, suspended }]`, accessible à tout utilisateur pour ses propres magasins.

## 5. Authentification (P2)

- `POST /register` ne renvoie **pas de token** : le mobile enchaîne automatiquement un `POST /login`.
- Le jeton Cloudflare Turnstile affiché dans Stitch n'est vérifié par aucun code backend : le mobile ne l'affiche pas.
- `POST /forgot-password` envoie un lien vers `FRONTEND_URL` (web). Pas de deep link mobile (`quickpharma://reset-password`). La réinitialisation se termine donc sur le web.
- `POST /forgot-password` répond une erreur de validation si l'email n'existe pas (énumération de comptes). Le mobile affiche le même message neutre dans les deux cas.
- `POST /logout` révoque **tous** les tokens de l'utilisateur (voir §6).

## 6. Sessions multi-appareils (P1 pour l'usage Web + Mobile)

Comportement attendu : une connexion mobile crée un token propre au mobile ; la déconnexion mobile ne supprime que ce token.

Comportement actuel :
- `login` crée toujours `createToken('MyApp')` : aucun nom d'appareil.
- `logout` exécute `$request->user()->tokens()->delete()` : **déconnexion du Web et de tous les appareils**.
- `config/sanctum.php` : `expiration => null` → tokens sans expiration, pas de refresh.

Le mobile appelle quand même `POST /logout` (sinon le token resterait valide indéfiniment) et purge SecureStore. Correctif proposé : [backend-proposals.md §1](backend-proposals.md#1-token-par-appareil-et-déconnexion-ciblée).

## 7. Notifications (P3)

- Pas d'enregistrement de token push (FCM / Expo) : le mobile interroge l'API toutes les 60 s quand l'écran est actif.
- `GET /showNotifications` et `GET /notifications/clear` exigent `id` / `for` alors que la valeur est ignorée.
- `GET /notifications/clear` modifie des données via un **GET**.
- `time` est une chaîne relative non localisée (`"12 m"`, `"3 h"`, `"2 d"`).

Proposition : `POST /devices` `{ platform, push_token, device_name }` et `DELETE /devices/{id}` ; `POST /notifications/read-all`.

## 8. Plans (P3)

- `GET /plans` renvoie aussi les plans **inactifs** (filtrés côté mobile sur `active`).
- `features` / `limits` sont du texte commercial libre ; les conditions réellement appliquées (plan versions : fonctionnalités, quotas) ne sont exposées qu'aux SuperAdmin. Il n'y a ni prix mensuel/annuel distinct ni remise, contrairement à la maquette Stitch.
- Proposition : `GET /plans/catalog` → plans publics avec `terms` publiés (features, quotas), `billing_period`, `provider_product_id`.

## 9. Devise et réglages (P2)

- `GET /GetSettings` ne renvoie **aucune devise** (uniquement des réglages de thème web). La devise est stockée par magasin dans `companies.Currency` (`MAD` à l'inscription), accessible seulement via `GET /company/show/{id}` qui exige `settings.view` et un id d'entreprise que le mobile ne connaît pas. Les montants sont donc affichés sans symbole.
- Proposition : ajouter `currency` (code ISO 4217) à `GET /access/me.store` ou à `GET /me/stores`.
- **Sécurité** : `GET /GetSettings` est public et renvoie une entrée `key` (valeur de type secret). À vérifier et retirer si ce n'est pas une donnée publique.
- `GET /translations/{lang}/1` contient des clés de validation Laravel brutes (`"the :attribute must contain at least one letter": {"": "…"}`), avec des clés vides.

## 10. Formats de réponse hétérogènes (P3)

Le client mobile gère : `{success,data,message}`, `{status,message,data}`, JSON brut (dashboard, traductions, notifications, plans/subscriptions/my), Resources `{data,links,meta}`, erreurs de validation en 400/404/422, refus d'accès `{code,reason,message_key,details}`.
