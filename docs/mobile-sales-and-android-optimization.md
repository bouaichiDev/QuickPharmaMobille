# Vente mobile et optimisation Android — 9 octobre 2026

## Parcours livré

- Menu Plus : routes web /sales, /sales/add et /pos reliées à la vente native, uniquement si présentes dans le menu du login et autorisées par les permissions. Navigation du bas conservée.
- Liste des ventes paginée et virtualisée, recherche temporisée, détail avec client, lignes et règlement.
- Nouvelle vente : client existant (client comptoir pour les ventes anonymes), recherche/scan produit, panier avec quantité et retrait, stock disponible, statut et mode de paiement issus des références du backend.
- Remise soumise à sales.apply_discount et création soumise à sales.create / sales.monthly. Taxe après remise, règlement partiel, reste et monnaie séparés. Payload conforme à la vente web, contexte établissement injecté par le client API existant.
- Encaissement des crédits via /credit-payment/pay, répartition FIFO explicitement annoncée. Disponible avec credits.view et payments.collect. Aucun réemploi de l'ancien endpoint /payments qui remplace les lignes de vente.
- Reçu : aperçu du détail, impression / PDF et partage texte.
- Tests : calculs et validations de stock, droits du menu, formulaire de vente avec paiement partiel et absence de remise sans droit. Les requêtes de test sont simulées ; aucune vente réelle ajoutée sur le backend.

## Build Google Play

- Plugin expo-build-properties compatible SDK 57 : minification R8 et suppression des ressources activées.
- Plugin local plugins/withAndroidOptimization.js : règles par défaut proguard-android-optimize.txt et android.r8.optimizedResourceShrinking=true, persistantes à chaque prebuild EAS.
- AGP conservé à la version supportée par React Native (8.12.0). Le pipeline de réduction optimisée est disponible dans cette version ; une migration isolée vers AGP 9 n'a pas été imposée.
- Orientation globale default : aucun verrouillage portrait dans le manifest généré. Layouts fluides et largeur de contenu limitée déjà utilisés par Screen / CrmPage ; boutons du formulaire flexibles.
- Le code de l'app ne définit pas les anciennes couleurs/translucidité des barres système. Des interfaces portant ces noms subsistent dans les dépendances React Native / react-native-screens ; une disparition de l'alerte edge-to-edge ne peut être certifiée sans les détails des appels signalés dans le nouvel AAB.
- Support 16 Ko déjà indiqué par Google sur le build 10 ; la configuration SDK/NDK compatible est conservée.
- Aucun nouveau pourcentage DEX ni taille Play Store annoncé avant analyse du prochain AAB. Les caches et captures restent ignorés par Git.

Sources :
- https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/
- https://developer.android.com/topic/performance/app-optimization/enable-app-optimization

## Vérifications

- TypeScript et lint : validés.
- 157 tests validés au total : 155 lors de la suite complète, puis les deux tests ayant dépassé 5 secondes pendant le build Android ont réussi au contrôle séparé (délai de 30 secondes, sans changement des tests).
- Bundle JavaScript Android généré. La vérification visuelle sur émulateur et un enregistrement réel sur le backend restent à effectuer.
- Le serveur de développement a été arrêté. Aucune publication Google Play effectuée.

- Compilation native : assembleRelease x86_64 réussie avec R8, réduction du code et des ressources ; APK de contrôle local signé avec la configuration locale, non destiné à être téléversé sur Google Play. Durée : 14 min 12 s.
- DEX non compressé de cet APK : 12.04 Mio. Mesure locale indicative, distincte des 58,8 MB du bundle Google Play et des pourcentages calculés par Google.
- Alias Windows Q: supprimé, émulateur et serveur de développement arrêtés.

## Reprise des tests sur émulateur

- APK de release installé et démarré sur Medium_Phone_API_35. Connexion avec le compte de test réussie ; menu du login et route Ventes accessibles.
- Liste, détail de vente existante, aperçu natif d’impression PDF et sélection des clients vérifiés. Crédit chargé : 133,20 pour le client de test. Aucun règlement ni vente créé pendant ces vérifications.
- Corrections après contrôle réel : nom de client depuis le champ customer de listeSales ; quantités depuis QteAvailable de productList, y compris zéro. Les quantités inconnues restent bloquées. Montants de la liste affichés avec deux décimales.
- TypeScript, lint et 16 tests ciblés validés après ces corrections (dont test de compatibilité QteAvailable).

- Nouvel assembleRelease optimisé réussi en 6 min 17 s et réinstallé. Contrôle visuel confirmé : Default Customer dans la liste, deux décimales, stocks 98/9/10 et zéro ; ajout au panier P9, total 240 ; sélection client et mode de paiement disponibles. Aucun enregistrement de vente ou règlement effectué.
- Application laissée ouverte dans l’émulateur, connectée au compte de test, sur Ventes. Alias Q: retiré. Aucun serveur Metro lancé.

## Intégration des 11 exports Stitch Ventes/POS — 10 octobre 2026

- Liste, produits, client, scanner, panier, paiement, confirmation vente, détail, crédit, confirmation règlement et reçu intégrés aux données/droits existants. Navigation inférieure conservée ; menus et rôle issus du login mis en cache.
- 27 suites / 162 tests validés, TypeScript et ESLint sans erreur. Test du paiement partiel et du solde crédit rechargé après réponse serveur incomplet inclus.
- APK x86_64 final compilé avec R8/réduction de ressources (1 min 8 s pour cette recompilation), installé et démarré sur Medium_Phone_API_35. DEX local 12,02 Mio, APK 43,80 Mio, mapping R8 présent. Mesures indicatives distinctes d'un AAB Google Play.
- Contrôle natif sans nouvelle transaction : produits, sélection client, panier, paiement intégral, dette 133,20 DH, détail/aperçu PDF et retour. Confirmation vente/règlement et reçu vérifiés en galerie de développement à 320/390/768 px. Cette galerie ne crée aucune donnée financière et reste réservée au développement.
- Rapport et comparaisons : `design-qa.md`, `docs/design-qa-sales/`. Caméra physique et scores Google Play non certifiés par ce contrôle.
- Application de release laissée ouverte sur Ventes dans l'émulateur. Metro arrêté après les captures et alias Q: retiré. Aucune publication Google Play.

## Vérification tablette — 10 octobre 2026

- APK natif contrôlé en 800×1280, 1280×800 et 600×960 dp via viewport/densité temporaires de l'émulateur Android. Ventes/panier/paiement, stock, menu, clients et formulaire/tableau de bord CRM vérifiés sans nouvelle transaction.
- Étapes POS et actions fixes centrées ; largeur des actions CRM plafonnée pour éviter l'étirement sur tablette. Pas de modification du menu inférieur.
- Support iPad activé dans la configuration des futurs builds iOS ; test iPad natif non effectué sur Windows.
- TypeScript, ESLint, format et 162 tests réussis. APK optimisé final compilé en 1 min 29 s, installé ; format téléphone restauré et pied du formulaire produits recontrôlé.
- Preuves et limites dans `design-qa.md` et `docs/design-qa-sales/tablet-verification.png`. Émulateur restauré, alias de compilation retiré ; aucune publication.

## Listes réellement responsive — correction après retour utilisateur

Largeur limitée supprimée pour les listes Ventes, produits POS, panier, sélection client, Stock et modules CRM. Grilles de une, deux ou trois colonnes selon la largeur disponible ; FlatList conservée pour les parcours POS, pagination/cache conservés. Menu inférieur inchangé. APK final vérifié en 800/1280/600 dp et sur téléphone ; article et total conservés après changement de colonnes. 162 tests, TypeScript et ESLint validés, compilation optimisée réussie en 1 min 8 s. Preuves : `docs/design-qa-sales/tablet-responsive.png` et `design-qa.md`.
