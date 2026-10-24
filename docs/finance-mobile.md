# Finance & Suivi — proposition 2

Référence visuelle sélectionnée : `exec-8bd2e8af-419a-40a7-bc54-eb858d571b28.png` (ensemble de douze écrans). L’implémentation garde les APIs et les règles métier du web. Les chiffres, variations mensuelles et images de démonstration ne sont jamais injectés dans les données réelles.

## Pages

`/finance/alerts-dashboard` : compteurs non lus, types et dernières alertes ; `/finance/alerts` et `/finance/alerts-smart` : recherche, priorités, type, période, pagination, lecture et détail par UID. Ignorer une alerte utilise le soft-delete existant et demande confirmation.

`/finance/cheques-dashboard` : agrégats serveur par statut et type, historique mensuel et échéances ; `/finance/cheques` : recherche, filtres, pagination, création/modification, photos recto/verso et historique. Les mutations sont confirmées et respectent les permissions et les transitions réelles du serveur. Déposer un chèque ne l’encaisse pas. `/finance/cheques-alerts` affiche les échéances signalées par l’API.

`/finance/credits` : encours clients et détail des ventes non soldées, historique des règlements, encaissement contrôlé (montant positif au plus égal au solde), espèces par défaut et imputation FIFO côté serveur. `/finance/overview` relie ces parcours. Les évolutions mensuelles des crédits et les dates d’échéance des ventes ne sont pas inventées : l’API ne les fournit pas.

La recherche de crédit nécessite le déploiement de `CreditPaymentController.php`. Les permissions des listes de référence client/fournisseur ont été complétées pour `cheques.manage`.

## Activer les notifications Android

1. Créer le projet Firebase et enregistrer l’application Android `com.quickpharma.mobile`.
2. Télécharger **google-services.json** (configuration client) dans la racine du projet mobile, ou utiliser une variable EAS de type fichier `GOOGLE_SERVICES_JSON`. Ne pas confondre ce fichier avec la clé privée du compte de service.
3. Dans EAS Credentials, ajouter la clé de compte de service **FCM V1** du même projet Firebase. Ne jamais mettre cette clé privée dans le bundle mobile, une variable `EXPO_PUBLIC_*` ou Git.
4. Définir `EXPO_PUBLIC_PUSH_ENABLED=true` dans l’environnement EAS utilisé pour construire l’APK. Par défaut l’intégration reste désactivée. La configuration refuse explicitement un build activé sans le fichier Google.
5. Déployer le backend et suivre son guide `docs/mobile-push.md` (migration, file d’attente, scheduler, activation).
6. Reconstruire un APK avec le profil `preview` ou un development build. **Expo Go Android ne prend pas en charge les notifications distantes.** Le navigateur web reste utilisable sans importer le module natif.
7. Installer l’APK, se connecter et accepter l’autorisation système de notification. Android reçoit un canal « Alertes QuickPharma ». Vérifier au premier plan, en arrière-plan et app fermée.

Le téléphone est enregistré pour la session et le magasin courant. Le serveur vérifie de nouveau la session, l’appartenance au magasin et ses accès avant d’envoyer. La déconnexion révoque aussi l’enregistrement si la connexion le permet ; les sessions API révoquées ne reçoivent plus d’envois. Un appui sur une notification n’ouvre que les types d’écran autorisés, pour le magasin actuellement connecté. Aucun changement de magasin automatique ni URL externe provenant du payload.

Un texte générique apparaît sur l’écran verrouillé ; les détails métier sont récupérés après navigation authentifiée. Les alertes déjà lues ne sont pas envoyées. Les reçus Expo sont vérifiés par le scheduler et les tokens invalides désactivés.

Sources : https://docs.expo.dev/versions/v57.0.0/sdk/notifications/ ; https://docs.expo.dev/push-notifications/fcm-credentials/ ; https://docs.expo.dev/push-notifications/sending-notifications/
