# Propositions de modifications backend (non appliquées)

Consigne de la mission : **le backend Laravel n'a pas été modifié**. Ces changements sont proposés séparément, à valider et appliquer par l'équipe backend.

## 1. Token par appareil et déconnexion ciblée

**Objectif** : une connexion mobile crée un token lié au mobile ; la déconnexion mobile supprime uniquement ce token et laisse la session Web active.

`app/Http/Controllers/API/RegisterController.php` :

```php
// login(): accepter un nom d'appareil optionnel (compatibilité web conservée)
$request->validate([
    'email' => 'required|email',
    'password' => 'required',
    'device_name' => 'nullable|string|max:100',
]);
// ...
$token = $user->createToken($request->input('device_name', 'web'))->plainTextToken;
```

```php
// logout(): révoquer uniquement le token utilisé par la requête
public function logout(Request $request)
{
    $request->user()->currentAccessToken()?->delete();

    return $this->sendResponse([], 'User logged out successfully.');
}

// Optionnel : déconnexion de tous les appareils, explicite
public function logoutAll(Request $request)
{
    $request->user()->tokens()->delete();

    return $this->sendResponse([], 'All sessions revoked.');
}
```

Côté mobile, il suffira d'envoyer `device_name` (ex. `"QuickPharma Android – Pixel 8"`) dans `authApi.login` : aucun autre changement.

Recommandé en complément :
- `config/sanctum.php` : `'expiration' => 60 * 24 * 30` (30 jours) + tâche `sanctum:prune-expired`.
- Liste des sessions : `GET /me/tokens` (nom, dernière utilisation) et `DELETE /me/tokens/{id}`.

## 2. Vérification Google Play

Voir [mobile-api-gaps.md §1](mobile-api-gaps.md#1-paiement-google-play-p1). Points de conception :
- Service `GooglePlaySubscriptionVerifier` (Google Play Developer API `purchases.subscriptionsv2.get`) avec compte de service stocké hors dépôt.
- Table `store_purchases` (`purchase_token` unique, `product_id`, `order_id`, `account_id`, `status`, `expires_at`, `raw_payload`).
- Mapping produit → `plans.provider_product_id` ; activation via le même chemin que `SubscriptionBillingController::validateBilling` pour conserver plan versions et quotas.
- Acquittement (`acknowledge`) côté serveur après activation.
- Webhook RTDN pour renouvellement, `grace_period`, `paused`, `cancelled`, `expired`, `refunded`.

## 3. Endpoint profil unifié

`GET /me` (route `self`) sans `store_id` obligatoire, et `POST /me/password`, `PUT /me/preferences` — voir [mobile-api-gaps.md §3](mobile-api-gaps.md#3-profil--me--et-compte-p2).

## 4. Magasins de l'utilisateur courant

`GET /me/stores` (route `self`) renvoyant les ids chiffrés et un identifiant public stable, pour que les employés multi-magasins puissent changer de magasin.

## 5. Dashboard du jour

`GET /dashboard/today` (permission `dashboard.view`) — voir [mobile-api-gaps.md §2](mobile-api-gaps.md#2-tableau-de-bord-p2). Retourner des nombres et non des chaînes `number_format`.

## 6. Sécurité à traiter en priorité

- `CryptoHelper::decryptLegacy` accepte encore des formats non authentifiés (forgeables) : à retirer dès que possible.
- `POST /forgot-password` : répondre toujours 200 avec un message neutre (pas de `exists:users`), stocker le token haché.
- Routes de debug `GET /user1` et `GET /test` (déclarée deux fois) à supprimer.
- Actions destructrices en `GET` (`/users/delete/{id}`, `/notifications/clear`, …) à migrer vers `POST`/`DELETE`.
- `Accept: application/json` implicite : dans `app/Exceptions/Handler.php`, forcer une réponse JSON pour `api/*` afin qu'un client oubliant l'en-tête ne reçoive pas une 500.
