# Correction visuelle CRM — 8 octobre 2026

final result: partial — corrections demandées vérifiées sur Android pour Admin ; fidélité complète des exports et autres rôles non certifiée

Cette validation remplace le précédent rapport, qui surestimait la fidélité de la première intégration. Elle ne constitue pas une validation des parcours authentifiés sur Android, ni une affirmation de reproduction pixel par pixel de chaque export.

## Références et captures

Les 18 dossiers numérotés du dossier Stitch ont été relus et leurs états recapturés à 390 × 740 px. Les références sont normalisées à 390 px et comparées sur la même hauteur visible. Les variantes récentes `liste_des_s_ances_quickpharma`, `planning_rendez_vous_crm_quickpharma` et `tableau_de_bord_crm_quickpharma`, ainsi que les comparaisons jointes par l’utilisateur, prennent priorité pour ces trois écrans.

Preuves dans `.cache/design-qa/` : `faithful-*.png`, `final-comparison-01.png` à `final-comparison-18.png`, `final-board-1.png` à `final-board-3.png`, `sessions-final-proof.png`. Les captures de chargement produites initialement ont été remplacées par des captures après stabilisation du rendu. Les premières captures `corrected-*` du rapport précédent ne sont plus les preuves de cette correction.

## Corrections vérifiées

- P1 : onglet Services CRM ajouté sans demande. Supprimé ; Accueil, Stock selon les droits, Notifs et Plus constituent la barre du bas. Aucun autre changement de cette barre pendant la reprise visuelle.
- P1 : carte de séance générique et filtres par paiement. Carte de soin avec icône, statut, forfait, métadonnées en colonnes, prix/reste, ordonnance et modification. Filtres natifs par statut réel de séance.
- P1 : tableau de bord sans carte de recettes Stitch. Dégradé bleu/vert, objectif configurable localement, quatre indicateurs compacts et actions en deux colonnes. Aucun objectif fictif sur les comptes réels.
- P2 : planning trop volumineux. Semaine compacte, numéro ISO, marqueurs issus des rendez-vous et filtre praticien. Horaire des rendez-vous lu depuis starts_at plutôt que session_date.
- P2 : fiches clients et catalogue génériques. Cartes dédiées clients, services, forfaits et paiements ; en-tête patient compact dans les historiques ; carte de service avec galerie et impression partagée entre dossier natif et aperçu.
- P2 : formulaires. Icônes dans les champs d’identité, unités dans les champs de prix et durée, compteur compact et estimation recalculée. L’image clinique utilise l’asset fourni par Stitch.
- P1 : boutons imbriqués sur web. Racines des cartes séparées de leurs actions ; aucun bouton imbriqué sur la capture finale des séances.

## Interactions constatées

Nouvelle séance ouvre une page de formulaire avec la barre inférieure visible. Plus peut être ouvert depuis cette page ; le glissement du bandeau vers le bas le ferme et conserve le formulaire. Le compteur passe de 6 à 7 séances et l’estimation de 2 700 à 3 150 DH. Le planning passe de la semaine ISO 13 à 14 et affiche la semaine suivante. Les écritures métier, suppressions, règlements et demandes de caméra n’ont pas été exécutés pendant cette QA.

## Différences de données et limites

Les données de démonstration restent isolées dans /design-preview. Les listes réelles, statuts, compteurs et permissions viennent du backend. Les exportations contiennent des exemples de patients, diagnostics, photos, certifications et cabines qui ne sont pas des données du compte connecté ; ces informations ne sont pas inventées. Les agrégats financiers absents sont affichés « — ». Les captures de formulaires de création montrent les références non encore sélectionnées. La galerie sans photos conserve un état vide. Les variations de contenu, dates et droits expliquent des différences entre maquettes et application.

P3 : réglages fins de typographie, contenus de sous-titres et longueur des titres selon les données. Les écrans gardent la navigation et les zones sûres natives demandées par l’utilisateur, même si la référence ne les représente pas. La feuille d’impression Android appartient au système.

## Vérifications techniques

107 tests / 17 suites réussis ; TypeScript et ESLint réussis ; export Android/Hermes final réussi (1 682 modules). Le dégradé natif utilise React Native et ne nécessite pas un nouveau module natif. Le scanner caméra est chargé uniquement si ExpoCamera est présent ; sur un ancien development build, une saisie manuelle reste disponible. Scanner caméra et impression demandent une reconstruction du development build si leurs modules n’y sont pas installés.

À vérifier sur téléphone : les autres rôles, le scanner caméra, les ajouts de photos et l’impression système. Le parcours Admin a maintenant été testé sur l’émulateur Android, comme détaillé ci-dessous.

## Validation authentifiée sur émulateur Android

Medium_Phone_API_35 a été lancé le 8 octobre 2026. Compilation native x86_64 réussie avec Gradle assembleDebug : 709 tâches, build de développement com.quickpharma.mobile.dev ; APK dans android/app/build/outputs/apk/debug/app-debug.apk. Aucun expo prebuild exécuté : la régénération a été refusée par la validation automatique et la compilation du projet natif existant a permis de continuer sans modifier les sources Android.

Après autorisation de l’utilisateur, emulator-5554 est passé à « device » et le pilotage ADB a permis le test natif. Le module RNCDatePicker était absent du premier APK à cause d’un cache d’autolinking ancien. Le cache généré a été recalculé, puis ses chemins normalisés vers le lecteur court Q: pour éviter la limite Windows et les conflits de racines C:/Q:. La nouvelle compilation a réussi : 536 tâches, 3 min 48 s. APK installé, démarrage réussi et connexion réussie avec le compte de test fourni ; la session est restaurée après redémarrage. Aucun mot de passe n’est enregistré dans ce rapport.

Écrans natifs effectivement consultés : tableau de bord CRM, séances, formulaire de nouvelle séance et calendrier Android, planning et changement de semaine, liste clients, dossier et historique des services, aperçu d’impression, catalogue de services et fiche détaillée, catalogue des forfaits et fiche détaillée, forfaits clients et fiche détaillée, formulaire de règlement et liste des paiements. Captures `native-*.png` et arbres d’accessibilité associés dans `.cache/design-qa/`. La barre inférieure affiche Accueil, Stock, Notifs, Plus dans les listes, fiches et formulaires. Plus se ferme par glissement du bandeau vers le bas et conserve le formulaire affiché.

Corrections issues de cette vérification native : la durée des rendez-vous utilise les horaires réels avant la durée par défaut du catalogue (60 et 120 minutes constatées), le formulaire affiche « Nouvelle séance », les références longues de paiement restent sur une ligne, et une photo en échec affiche « Photo indisponible » avec Réessayer au lieu d’une zone blanche. Une photo du compte reste indisponible : la récupération de son fichier n’a pas été confirmée. L’aperçu d’impression a été ouvert, sans lancement d’impression système.

TypeScript et ESLint passent après ces corrections ; 107 tests / 17 suites passent. Aucun enregistrement, encaissement, ajout de photo ou suppression métier effectué. Cette vérification confirme le fonctionnement des parcours consultés pour Admin ; elle ne constitue pas une validation de tous les rôles ni une certification de fidélité pixel par pixel de tous les écrans Stitch.


## Reprise du 9 octobre — corrections des 11 points

Cette section remplace les résultats antérieurs pour les composants modifiés. Contrôle natif authentifié sur Medium_Phone_API_35, rendu GPU host, Metro sur 8082 (ADB reverse 8081 et 8082). Les données sont celles du compte de test ; aucune donnée médicale réelle ajoutée.

- En-têtes CRM : logo retiré dans les listes, fiches, formulaires et dossier. La barre Accueil / Stock / Notifs / Plus reste inchangée.
- Actions : Modifier, Encaisser/Convertir et Supprimer regroupés dans une seule zone. Contrôle natif des fiches service, forfait et séance, captures `service-detail-actions`, `package-detail-final`, `session-extra-visible-final`.
- Couleurs : palette avec noms et sélection visible, sans champ Hex imposé ; compteur +/− pour service et composition de forfait. `layer-swiped`, `package-counter-visible` et `package-counter-increment` (4 → 5, modification annulée).
- Rapports : carte de recettes, graphique défilant, nouveaux/fidèles clients, performances et RDV issus des agrégats API. `reports-native-final` : 521 encaissé, 5 nouveaux clients, 1 fidèle. Aucun export Stitch dédié aux rapports trouvé ; adaptation du langage graphique du tableau de bord, pas une reproduction exacte inexistante.
- Paiements : `payments-native-final` confirme Default Customer + TEST, sans référence UUID en titre. Le patch PHP local enrichit aussi les relations service/forfait dans PaymentResource pour les rôles sans lecture du catalogue ; ce patch n’est pas déployé sur le serveur distant.
- Historique : `history-native-final` confirme client, soin, date et auteur. Le backend ne fournit pas d’entrée Historique au menu de ce rôle : aucune entrée supplémentaire n’est inventée ; écran contrôlé par son lien interne autorisé et accessible via le dossier.
- Champ supplémentaire : création native Note DEMO mobile, ordre vide normalisé à 0, sauvegarde réussie. Valeur saisie dans le formulaire de séance puis retrouvée après réouverture : `session-extra-visible-final`.
- Ordonnance : une ligne fictive enregistrée via le formulaire de séance, relue dans l’onglet Ordonnances, aperçu natif et impression système ouverts : `prescription-preview-final`, `prescription-system-preview`. Aucun fichier exporté ni impression physique lancée.
- Dossier : structure patient / RDV / statistiques / forfaits / séances et onglet Ordonnances. Les quatre statistiques suivent le contrat du web (encaissé, séances, rendez-vous, forfaits) ; pas de solde global inventé à partir des cinq dernières séances. Pas de photo ou d’allergie inventée.
- Plus : modules issus de `/access/me`, ordre et libellés du backend, filtrés par permissions et visibilité. Profil, notifications et abonnement restent dans la section du compte ; tests des menus absents, cachés et des droits révoqués. Aucun changement du compte ou de ses rôles pour le test.

Comparaisons réunissant les deux images à 411 px de largeur : `comparaison-dossier-9oct.png` (Stitch/mobile), `comparaison-rapports-9oct.png`, `comparaison-actions-9oct.png` (captures avant/mobile). Différences voulues : absence de logo demandée, données fictives réellement enregistrées, statistiques du contrat web, navigation inférieure native conservée.

Vérifications finales : TypeScript et ESLint réussis ; 19 suites / 113 tests réussis ; PHP syntaxe réussie pour PaymentsController et PaymentResource. La création/sauvegarde/réouverture du champ texte et de l’ordonnance est testée sur Android. Tous les types de champs supplémentaires et tous les rôles n’ont pas été testés en conditions réelles. Pas de certification pixel par pixel de chaque écran.


## Correction du cache des menus — 9 octobre

Le login et check-token renvoient l’arbre des menus dans `data.permissions`. Cet arbre est désormais conservé dans la session SecureStore et utilisé par Plus. Une liste vide explicitement reçue ne déclenche pas un retour à un autre arbre. Le contrôle de session remplace les menus par ceux du rôle courant. Suppression du refetch à chaque ouverture et du polling de `/access/me` ; les droits détaillés (absents du payload de login actuel) sont chargés une fois par établissement, gardés en cache et actualisés sur invalidation explicite ou refus serveur. Les changements d’établissement et déconnexions vident toujours les caches.

Validation : 20 suites / 117 tests réussis, TypeScript et ESLint réussis. Test de réouverture : une seule lecture réseau, seconde lecture uniquement après invalidation. Tests du stockage des menus login, remplacement lors de check-token et conservation d’un arbre vide.


## Correction du cache des menus — 9 octobre

Le login et check-token renvoient l’arbre des menus dans `data.permissions`. Cet arbre est désormais conservé dans la session SecureStore et utilisé par Plus. Une liste vide explicitement reçue ne déclenche pas un retour à un autre arbre. Le contrôle de session remplace les menus par ceux du rôle courant. Suppression du refetch à chaque ouverture et du polling de `/access/me` ; les droits détaillés (absents du payload de login actuel) sont chargés une fois par établissement, gardés en cache et actualisés sur invalidation explicite ou refus serveur. Les changements d’établissement et déconnexions vident toujours les caches.

Validation : 20 suites / 117 tests réussis et TypeScript réussi. Test de réouverture : une seule lecture réseau, seconde lecture uniquement après invalidation. Tests du stockage des menus login, remplacement lors de check-token et conservation d’un arbre vide.


## Accueil par rôle et menus non réalisés — 9 octobre

`default_route` est utilisé à la connexion et lors de la restauration : route CRM connue vers sa page native, `/services-crm` vers l’accueil CRM, `/superadmin/dashboard` vers l’accueil plateforme, autres pages disponibles vers leur écran natif. Une route explicite inconnue ou une route CRM sans droit ne retombe plus sur le tableau des ventes. Le tableau SuperAdmin présente les établissements, utilisateurs, abonnements, revenus récurrents et activité du jour issus des mêmes endpoints globaux que le web (`superadmin/overview`, `superadmin/dashboard/snapshot`), sans contexte d’établissement. Les pages d’administration détaillées restent grisées lorsqu’elles n’existent pas sur mobile.

Plus conserve tous les menus visibles transmis au rôle par le backend, dans leur ordre et hiérarchie. Les routes sans écran mobile sont désactivées et portent « À développer sur mobile ». Une page réalisée sans permission est désactivée avec « Accès non autorisé ». Les menus explicitement hidden restent masqués comme sur le web ; aucune entrée d’un autre rôle n’est inventée. Les menus déjà disponibles, dont Abonnements, restent actifs. Capture native : `all-menu-translated-final.png` (16 modules généraux, puis modules CRM plus bas). Barre inférieure inchangée, aucun refetch à chaque ouverture.

Vérification en direct avec le compte Admin fourni pour le menu. Les comptes Service et SuperAdmin n’ont pas été connectés en direct ; leurs redirections et le contrat de données du tableau plateforme sont couverts par les tests automatisés. L’écran plateforme mobile reprend les indicateurs du web, pas l’intégralité de ses tables d’administration.

Les menus visibles sans route sont aussi affichés et désactivés. Validation finale de cette reprise : 21 suites / 125 tests, TypeScript et ESLint réussis.
