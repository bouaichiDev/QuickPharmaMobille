Tu es un développeur senior Laravel 10 / PHP 8.1+, spécialiste des paiements in-app Google Play et des architectures SaaS multi-tenant.

Ta mission : ajouter au backend QuickPharma la gestion des abonnements achetés via **Google Play Billing** depuis l'application mobile, sans casser l'application Web ni le système d'accès existant.

## CHEMINS

- Backend Laravel (à modifier) : `C:\laragon\www\sassApi`
- Application mobile (lecture seule, contrat client) : `C:\Users\badz_\Desktop\Bureau\reactNative\MobileQuckPharma`
  - contrat attendu : `src/services/billing/types.ts`, `src/services/billing/billingService.ts`
  - besoins documentés : `docs/mobile-api-gaps.md` §1, `docs/backend-proposals.md` §2
- Frontend Web (lecture seule, ne pas modifier) : `C:\Users\badz_\Desktop\Bureau\appreact\pharma-stock-nexus`

Vérifie d'abord que ces chemins existent ; arrête-toi et signale tout chemin invalide.

## CONTEXTE EXISTANT À RESPECTER

- Auth : Laravel Sanctum (token Bearer). Magasin courant : `store_id` **chiffré** (`CryptoHelper`), en query pour GET, en corps sinon, résolu par `TenantContext::resolveRequestStoreId`.
- Contrôle d'accès maison : `app/Http/Middleware/EnforceRouteAccess` refuse toute route non classée. Chaque nouvelle action de contrôleur doit être déclarée dans `app/Services/Access/Routes/definitions/*.php` (ex. `platform.php`). Documentation : `docs/access-control/{api-contract.md, matrix.md, openapi.yaml, types.ts}`.
- Refus d'accès au format `AccessDeniedException` : `{success:false, status:false, code, reason, message, message_key, details}`.
- Permissions concernées : `subscription.view`, `subscription.manage` (seul le propriétaire / manager autorisé achète).
- Plans : modèle `Plan` (`price`, `duration_in_days`, `features`, `limits`, `active`, `provider_product_id`, `signup_default`) et conditions versionnées `Access\PlanVersion` ; `SubscriptionResolver::versionForSale()`.
- Abonnements : modèle `Subscription` (id préfixé `sub_…`, `user_id` = propriétaire du compte, `plan_id`, `plan_version_id`, `start_date`, `end_date`, `trial_end_date`, `status_id` → table `statuses` src `subscription`, `autorenew`, `payment_method_id`, `subscription_type_id`, `provider_subscription_id`, `provider_order_id`, `raw_webhook`).
- Facturation manuelle existante : `SubscriptionBillingController::validateBilling` (activation / prolongation par un SuperAdmin) et `subscription_billings`. Statuts d'abonnement actuels : `active`, `pending`, `expired`, `cancelled`, `incomplete`.
- `AccessVersionService` : les droits renvoyés par `GET /access/me` doivent être invalidés après tout changement d'abonnement.
- Le mobile rafraîchit `/access/me` après un achat ; il n'active jamais rien lui-même.

## RÈGLES

- Ne modifie pas le frontend Web ni l'application mobile.
- Ne casse aucun flux existant (souscription manuelle, validation SuperAdmin, essais, quotas, plan versions).
- Aucun secret dans le dépôt : clé du compte de service Google via variable d'environnement / fichier hors dépôt, documenté dans `.env.example` sans valeur.
- Le serveur est la seule autorité : aucun abonnement n'est activé sans vérification auprès de Google Play Developer API.
- Idempotence stricte : un même `purchaseToken` ne peut jamais activer deux abonnements ni être rattaché à deux comptes.
- Multi-tenant : un achat est lié au **compte propriétaire** du magasin du `store_id` vérifié, jamais à un id fourni par le client.
- Migrations réversibles, transactions pour les écritures liées, logs sans token ni données personnelles.
- Travaille progressivement : analyse, plan, implémentation, tests, rapport. Ne prétends jamais qu'une chose fonctionne sans l'avoir testée.

## ÉTAPE 1 — ANALYSE (avant tout code)

Analyse et résume : `SubscriptionController`, `SubscriptionBillingController`, `PlanController`, `SubscriptionResolver`, `AccessEvaluator`, `QuotaService`, `AccessVersionService`, `TenantContext`, `AccountResolver`, les modèles `Plan`, `PlanVersion`, `Subscription`, `SubscriptionBilling`, `Status`, `Type`, les seeders de statuts/types, les définitions de routes d'accès, `routes/route/subscription.php`, et les tests existants. Identifie comment une activation manuelle prolonge ou remplace un abonnement, et réutilise ce chemin.

Produis un rapport court : points d'intégration, risques, décisions à valider (ex. un seul abonnement actif par compte, changement de plan en cours de période, coexistence avec un abonnement manuel), puis attends validation si une décision métier est ambiguë.

## ÉTAPE 2 — CONCEPTION ATTENDUE

### Configuration
- Dépendance officielle `google/apiclient` (ou client HTTP + OAuth2 compte de service) pour `androidpublisher v3`.
- `config/services.php` → `google_play` : `package_name`, `service_account_json_path` (ou JSON en variable), `rtdn_audience`, `rtdn_service_account_email`, `enabled`.

### Données
- Table `store_products` (ou colonnes dédiées) : correspondance `plan_id` ↔ `platform` (`google_play`), `product_id`, `base_plan_id`, `offer_id` nullable, `active`. `plans.provider_product_id` peut rester pour compatibilité mais la correspondance doit supporter plusieurs base plans (mensuel/annuel).
- Table `store_purchases` : `platform`, `purchase_token` (unique, stocké haché + chiffré si besoin de réinterroger Google), `product_id`, `base_plan_id`, `order_id`, `account_user_id` (propriétaire), `store_id`, `subscription_id` (FK), `status`, `started_at`, `expires_at`, `auto_renewing`, `acknowledged_at`, `linked_purchase_token`, `obfuscated_account_id`, `last_notification_type`, `raw_payload` (JSON), timestamps.
- Statuts `subscription` à ajouter via seeder/migration de données : `grace_period`, `paused`, `on_hold` (ou mappé sur `paused`), `refunded`, en plus des existants. Statuts exposés au mobile : `pending`, `purchased`, `active`, `cancelled`, `expired`, `grace_period`, `paused`, `refunded`.
- Correspondance Google `SubscriptionState` → statut QuickPharma :
  - `SUBSCRIPTION_STATE_PENDING` → `pending`
  - `SUBSCRIPTION_STATE_ACTIVE` → `active`
  - `SUBSCRIPTION_STATE_IN_GRACE_PERIOD` → `grace_period` (accès conservé)
  - `SUBSCRIPTION_STATE_ON_HOLD` → `paused` (accès suspendu)
  - `SUBSCRIPTION_STATE_PAUSED` → `paused`
  - `SUBSCRIPTION_STATE_CANCELED` → `cancelled` (accès jusqu'à `expiryTime`)
  - `SUBSCRIPTION_STATE_EXPIRED` → `expired`
  - achat annulé / remboursé (voided purchase) → `refunded` (accès retiré)

### Services
- `GooglePlaySubscriptionVerifier` : appelle `purchases.subscriptionsv2.get(packageName, token)`, valide `packageName`, produit, base plan, état, `expiryTime`, `acknowledgementState`, `externalAccountIdentifiers.obfuscatedExternalAccountId`.
- `StoreSubscriptionActivator` : dans une transaction avec verrou sur le token, crée ou met à jour `store_purchases`, crée/prolonge l'abonnement QuickPharma via la même logique que l'activation manuelle (plan version via `SubscriptionResolver::versionForSale`, `end_date = expiryTime`, `autorenew`, `payment_method_id` = type « google_play » à créer dans `types`), expire proprement l'abonnement précédent si c'est la règle existante, gère `linkedPurchaseToken` (upgrade/downgrade), puis invalide l'`access_version`.
- Acquittement côté serveur : `purchases.subscriptions.acknowledge` après activation réussie (si non acquitté), avec reprise en cas d'échec.
- `obfuscatedExternalAccountId` : fournir au mobile un identifiant opaque par compte (ex. HMAC de l'id propriétaire) pour lier l'achat au compte et refuser un token rattaché à un autre compte.

### Endpoints (préfixe `/api`, groupe `auth:sanctum` + `tenant`, throttle adapté)

| Méthode | Route | Permission | Rôle |
|---|---|---|---|
| GET | `/billing/google-play/products` | `subscription.view` | plans publics actifs + `product_id`, `base_plan_id`, `offer_id`, conditions publiées (features, quotas) |
| GET | `/billing/google-play/account-token` | `subscription.manage` | `obfuscated_account_id` à passer à Google Play lors de l'achat |
| POST | `/billing/google-play/verify` | `subscription.manage` | vérifie et active un achat |
| POST | `/billing/google-play/restore` | `subscription.manage` | revérifie les achats actifs du téléphone |
| GET | `/billing/google-play/status` | `subscription.view` | état synchronisé de l'abonnement Play du compte |
| POST | `/billing/google-play/rtdn` | public signé | Real-time Developer Notifications (Pub/Sub push) |

Contrat attendu par le mobile (ne pas changer les noms) :

```json
// POST /billing/google-play/verify
{ "platform": "google_play", "store_id": "<chiffré>", "plan_id": 2, "product_id": "qp_pro", "purchase_token": "…", "package_name": "com.quickpharma.mobile" }

// 200
{ "success": true, "message": "…", "data": {
  "subscription_id": "sub_…", "plan_id": 2, "status": "active",
  "expires_at": "2026-10-16T10:00:00+01:00", "auto_renewing": true
} }

// POST /billing/google-play/restore
{ "store_id": "<chiffré>", "purchases": [ { "product_id": "qp_pro", "purchase_token": "…" } ] }
// 200 → data: VerifiedSubscription[]
```

Erreurs (format `AccessDeniedException` existant ou `{success:false, code, message, details}`), codes à ajouter et traduire dans `langs` (`access.errors.*` ou `billing.errors.*`, fr/ar/en/es) :
`PURCHASE_INVALID`, `PURCHASE_PACKAGE_MISMATCH`, `PRODUCT_NOT_MAPPED`, `PURCHASE_ALREADY_LINKED` (409), `PURCHASE_PENDING` (202), `PURCHASE_EXPIRED`, `BILLING_UNAVAILABLE` (503 si Google indisponible), plus les refus `PERMISSION_DENIED` / `STORE_ACCESS_DENIED` existants.

### RTDN
- Vérifier le JWT OIDC du push Pub/Sub (émetteur Google, `aud` = `rtdn_audience`, e-mail du compte de service attendu) ; refuser sinon.
- Décoder `message.data` (base64) : `subscriptionNotification` (types 1 à 13 : recovered, renewed, canceled, purchased, on hold, in grace period, restarted, price change, deferred, paused, pause schedule changed, revoked, expired) et `voidedPurchaseNotification`.
- Ne jamais faire confiance au contenu de la notification : relancer `subscriptionsv2.get`, puis appliquer l'état via `StoreSubscriptionActivator`.
- Idempotence par `message.messageId`, réponse 200 rapide, traitement via job en file d'attente avec retries.
- Déclarer la route comme `public` dans les définitions d'accès.

### Planification
- Commande `billing:google-play:sync` (planifiée quotidiennement) qui revérifie les achats `active`, `grace_period`, `paused`, `cancelled` proches de l'échéance, pour rattraper des RTDN perdues.

## ÉTAPE 3 — TESTS

Tests Feature/Unit (PHPUnit ou Pest selon le projet) avec le client Google **mocké** :
- achat valide → abonnement actif, plan version correcte, `end_date` = expiry, access_version invalidée ;
- token déjà lié à un autre compte → 409 `PURCHASE_ALREADY_LINKED` ;
- rejouer le même token → idempotent, aucun doublon ;
- package / produit inconnu → erreur dédiée ;
- utilisateur sans `subscription.manage` → 403 ; `store_id` d'un autre compte → 403 `STORE_ACCESS_DENIED` ;
- `pending` → aucun accès ouvert ;
- RTDN : signature invalide refusée ; renouvellement prolonge ; grace period conserve l'accès ; on hold / paused suspend ; expiration retire ; voided purchase → `refunded` ;
- upgrade avec `linkedPurchaseToken` → ancien achat clos, nouveau plan actif ;
- non-régression : souscription manuelle et `validateBilling` inchangés ; `GET /access/me` reflète le nouveau plan.

Exécute la suite de tests existante complète et corrige toute régression.

## ÉTAPE 4 — LIVRABLES

1. Migrations, modèles, seeders de statuts/types, services, contrôleurs, FormRequests, Resources, job RTDN, commande de synchro.
2. Routes + déclarations dans `app/Services/Access/Routes/definitions`.
3. Traductions fr/ar/en/es des nouveaux messages.
4. Mise à jour de `docs/access-control/api-contract.md`, `matrix.md`, `openapi.yaml`, `types.ts`.
5. `docs/google-play-billing.md` : configuration Play Console (produits, base plans, compte de service, droits API, topic Pub/Sub, notifications en temps réel, testeurs de licence), variables d'environnement, schéma du flux, table de correspondance des statuts, procédure de test en piste interne.
6. `.env.example` mis à jour sans secret.
7. Rapport final : fichiers créés/modifiés, résultats des tests, ce qui n'a pas pu être testé (ex. appel réel à Google), actions manuelles restantes côté Play Console.
