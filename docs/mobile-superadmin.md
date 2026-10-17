# Super Admin mobile

Implémentation locale du 16 octobre 2026. Sources visuelles : dossier Stitch `stitch_quickpharma_logo_integration`, contrats et parcours du web existant.

## Périmètre

- Tableau de bord global, santé opérationnelle, magasins avec recherche et filtres d’abonnement, état, plan et pagination.
- Fiche magasin : indicateurs ventes, achats, commandes, CRM, stock, inventaire, factures, utilisateurs, séries temporelles et journal d’activité.
- Suspension/réactivation, gestion d’abonnement et accès assistance temporaire avec bannière et sortie explicite.
- Factures d’abonnement : filtres, détail, PDF authentifié, confirmation de réception des fonds avant validation, suppression récupérable/restauration.
- Plans commerciaux, versions, brouillons, fonctionnalités, quotas, essais, publication, aperçu d’impact, migration explicite des abonnements sélectionnés, plan gratuit d’inscription.
- Catalogue des accès, rôles et permissions, hiérarchie/règles des menus, attribution des menus et route par défaut.
- Utilisateurs, rattachements aux magasins, exceptions temporaires, simulation des droits, audit administratif, traductions et référentiels.
- Catalogue central : recherche, sélection, prévisualisation et import avec protection contre les doublons.

Le menu Plus conserve le menu reçu dans la session. Les destinations sans écran mobile restent grisées. L’administration des accès regroupe les écrans globaux. Les opérations de commerce du magasin et la gouvernance globale restent distinctes.

## API et compatibilité

Les tests interactifs utilisent l’API locale sur le port 8000 et Expo sur 8081. `.env.local` pointe vers l’adresse Wi-Fi du poste ; un téléphone physique doit être sur le même réseau. La configuration de production conserve son URL existante.

Les requêtes de gouvernance utilisent `skipStoreContext`, le jeton existant et les permissions de plateforme. Les nouvelles routes `/superadmin/mobile/*` fournissent le profil global, les indicateurs complémentaires, des listes bornées d’utilisateurs/magasins/référentiels et les opérations utilisateur. Elles exigent SuperAdmin et la permission correspondante. Aucun contrôleur web existant ni migration de base n’a été modifié. Le dépôt frontend web n’a pas été modifié.

Les nouveaux endpoints doivent être livrés avec le mobile pour les fonctionnalités qui les utilisent. Aucun déploiement n’a été effectué.

## Performance

Listes virtualisées, pagination 25 éléments (50 maximum sur les nouvelles API), recherche temporisée, annulation des lectures abandonnées, cache 1–2 minutes et aucune interrogation périodique. Les panneaux coûteux sont chargés à leur ouverture. Les graphiques utilisent des composants légers ; aucune dépendance graphique supplémentaire. Les mutations ont une protection contre le double envoi et ne sont pas rejouées automatiquement.

La mise en page mesure le conteneur : 1 colonne téléphone, 2–3 colonnes tablette et liste/détail à partir de 1100 px. Les écrans de gouvernance occupent la largeur disponible.

La minification R8 et la réduction des ressources release étaient déjà activées et restent activées. Le score DEX de Google Play doit être revérifié après un nouveau bundle ; ces tests ne mesurent pas les ANR ou la mémoire sur appareil.

## Validation

- 38 suites mobiles, 211 tests réussis.
- 26 tests backend, 133 assertions : sécurité, pagination, projections sans secrets, isolation des magasins, quotas et rattachements idempotents. Exécutés sur `sasspharmacy_test` avec une configuration de test séparée.
- Connexion Super Admin réelle à l’API locale ; tableau de bord, magasins, filtre abonnement actif, fiche et statistiques, liste/détail des factures inspectés dans le navigateur Expo.
- Formats navigateur 390×844, 800×1100 et 1280×900. Captures de démonstration dans `docs/design-qa-superadmin` ; captures contenant des données locales dans `.cache/design-qa-superadmin` (ignoré par Git).
- Export Android/Hermes réussi : `.cache/superadmin-android`, bundle de 5,3 Mo. Ce bundle utilise l’environnement local de validation et ne constitue pas une livraison Play Store.

Les actions de validation financière, suspension, assistance et changement de permissions n’ont pas été déclenchées sur la copie locale des données métier. Les formulaires et protections sont couverts partiellement par les tests automatisés ; tous les parcours d’écriture n’ont pas été essayés manuellement. La régression native Android/iPad, l’ouverture native du PDF et le profilage release restent à effectuer avant publication. Le téléchargement PDF navigateur a été déclenché sans erreur affichée ; son rendu n’a pas été inspecté.

Les éléments décoratifs Stitch sans source métier (SLA, version Live, incidents de prélèvement inventés) ne sont pas affichés comme des informations réelles. Les délais d’expiration suivent les données de l’API existante (7 jours). La parité visuelle intégrale de chaque écran Stitch n’est pas certifiée par ces contrôles.
