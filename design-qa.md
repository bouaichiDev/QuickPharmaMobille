# Produits Stitch â€” 15 octobre 2026

RÃ©sultat : intÃ©gration revue sur navigateur aux formats tÃ©lÃ©phone et tablette. La fidÃ©litÃ© pixel par pixel et le fonctionnement visuel natif complet ne sont pas certifiÃ©s.

RÃ©fÃ©rences : les douze `screen.png` et `code.html` du dossier Stitch fourni. Les dix vues tÃ©lÃ©phone ont Ã©tÃ© recapturÃ©es Ã  399 px de large et Ã  la hauteur proportionnelle de leur rÃ©fÃ©rence. Comparaison ouverte et examinÃ©e : `docs/design-qa-products/comparison.png`. Pour la tablette, le HTML Stitch a Ã©tÃ© rendu Ã  1280 Ã— 900 : contrairement au PNG Ã©troit exportÃ©, il dÃ©crit bien une composition Ã  deux panneaux. Comparaison Ã  dimensions Ã©gales : `docs/design-qa-products/tablet-comparison.png`. Le format portrait 800 Ã— 1100 a Ã©galement Ã©tÃ© contrÃ´lÃ©.

Corrections : cartes, photos fournies, densitÃ©, filtres, tarifs, lots FIFO, code-barres scannable, association explicite, emplacements et sÃ©lection de bac, sessions et synthÃ¨se dâ€™inventaire. La tablette utilise dÃ©sormais une composition dÃ©diÃ©e : liste compacte Ã  gauche, fiche avec trois indicateurs, code-barres, quatre actions et tableau FIFO Ã  droite. Le formulaire produit existant reste accessible. Les noms de produits ont Ã©tÃ© rÃ©tablis dans le comptage et couverts par un test de rÃ©gression.

La vÃ©rification de lâ€™Ã©tiquette a rÃ©vÃ©lÃ© un encodeur UTF-8 absent de la bibliothÃ¨que QR principale. Correction et deux tests ajoutÃ©s. Lâ€™Ã©tiquette capturÃ©e a Ã©tÃ© dÃ©codÃ©e indÃ©pendamment : `RAY-A-01`. Export inventaire XML tÃ©lÃ©chargÃ© et analysÃ© avec succÃ¨s. Les rÃ©fÃ©rences y restent des chaÃ®nes ; le format Excel proposÃ© est SpreadsheetML `.xml`, pas `.xlsx`. Lâ€™association interactive de code-barres a rÃ©ussi dans la galerie isolÃ©e. Aucune erreur navigateur `pageerror` lors du dernier contrÃ´le tablette, QR et export, ni dans les dix vues et lâ€™association.

Ã‰carts conservÃ©s : navigation infÃ©rieure existante et absence de logo dans les fiches, Ã  la demande de lâ€™utilisateur. DonnÃ©es, dates, quantitÃ©s, rÃ©fÃ©rences, droits et rÃ©sultats diffÃ¨rent des exemples Stitch. Les impacts dâ€™inventaire utilisent le coÃ»t dâ€™achat du backend ; ils ne sont pas modifiÃ©s pour reproduire un montant fictif. Les capacitÃ©s et zones proviennent des mÃ©tadonnÃ©es ; aucune tempÃ©rature, certification, carte physique ou imprimante connectÃ©e nâ€™est inventÃ©e. Commander reste grisÃ© en lâ€™absence de formulaire mobile de commande fournisseur. Quelques Ã©carts de typographie, icÃ´nes et espacements subsistent ; ce contrÃ´le ne vaut pas dÃ©claration dâ€™identitÃ© exacte.

VÃ©rification : TypeScript et ESLint ; 35 suites / 188 tests mobiles rÃ©ussis ; 13 tests / 78 assertions backend dans la base dÃ©diÃ©e exclusivement. API locale consultÃ©e en lecture seule pour produits, emplacements et sessions. La compilation Android prÃ©cÃ©dente Ã©tait rÃ©ussie ; la compilation finale incluant la correction QR est suivie dans `.cache/products-native-build.log`.

Limites : lâ€™Ã©mulateur Android a prÃ©sentÃ© un Ã©cran noir puis quittÃ© lors des tentatives de dÃ©marrage ; aucune capture native produit fiable nâ€™en a Ã©tÃ© dÃ©duite. CamÃ©ra physique, impression matÃ©rielle, iOS et performance dâ€™une validation de plusieurs milliers de lignes restent Ã  vÃ©rifier. Aucun dÃ©ploiement VPS, aucune publication Play Store et aucune Ã©criture de stock mÃ©tier lors des contrÃ´les.

## Gestion des unités de stock — 15 octobre 2026

Les captures `inventory-management-phone.png`, `inventory-management-portrait.png`, `inventory-management-tablet.png`, `inventory-add-phone.png`, `inventory-add-tablet.png`, `inventory-edit-review.png` et `inventory-transfer-review.png` ont été ouvertes et inspectées. Contrôle navigateur à 399 × 900, 800 × 1100 et 1280 × 900, avec données fictives en mémoire : ajout, modification, transfert, rebut et suppression confirmés ; quantités mises à jour ; historique ouvert ; zéro `pageerror`. Le récapitulatif précède chaque mutation. L’interface tablette affiche les résumés et champs côte à côte et les unités sur deux ou trois colonnes. Les actions suivent les permissions du contexte, sans nouvel onglet inférieur.

Validation fonctionnelle : 204 tests mobiles / 36 suites, 24 tests backend stock / 193 assertions. Les tests couvrent les droits, les limites, la pagination, la sélection persistante, les dates et références, les confirmations rejouées sans doublon, l’annulation complète en cas d’échec du mouvement et le rattachement du stock au produit de destination. La nouvelle migration de confirmations est appliquée à l’API locale et à la base dédiée de tests. Vérification TypeScript/ESLint réussie. Aucun nouvel essai sur appareil physique ni déploiement VPS ; aucune nouvelle compilation native nécessaire aux dépendances, qui restent inchangées.

# Correction visuelle CRM â€” 8 octobre 2026

final result: partial â€” corrections demandÃ©es vÃ©rifiÃ©es sur Android pour Admin ; fidÃ©litÃ© complÃ¨te des exports et autres rÃ´les non certifiÃ©e

Cette validation remplace le prÃ©cÃ©dent rapport, qui surestimait la fidÃ©litÃ© de la premiÃ¨re intÃ©gration. Elle ne constitue pas une validation des parcours authentifiÃ©s sur Android, ni une affirmation de reproduction pixel par pixel de chaque export.

## RÃ©fÃ©rences et captures

Les 18 dossiers numÃ©rotÃ©s du dossier Stitch ont Ã©tÃ© relus et leurs Ã©tats recapturÃ©s Ã  390 Ã— 740 px. Les rÃ©fÃ©rences sont normalisÃ©es Ã  390 px et comparÃ©es sur la mÃªme hauteur visible. Les variantes rÃ©centes `liste_des_s_ances_quickpharma`, `planning_rendez_vous_crm_quickpharma` et `tableau_de_bord_crm_quickpharma`, ainsi que les comparaisons jointes par lâ€™utilisateur, prennent prioritÃ© pour ces trois Ã©crans.

Preuves dans `.cache/design-qa/` : `faithful-*.png`, `final-comparison-01.png` Ã  `final-comparison-18.png`, `final-board-1.png` Ã  `final-board-3.png`, `sessions-final-proof.png`. Les captures de chargement produites initialement ont Ã©tÃ© remplacÃ©es par des captures aprÃ¨s stabilisation du rendu. Les premiÃ¨res captures `corrected-*` du rapport prÃ©cÃ©dent ne sont plus les preuves de cette correction.

## Corrections vÃ©rifiÃ©es

- P1 : onglet Services CRM ajoutÃ© sans demande. SupprimÃ© ; Accueil, Stock selon les droits, Notifs et Plus constituent la barre du bas. Aucun autre changement de cette barre pendant la reprise visuelle.
- P1 : carte de sÃ©ance gÃ©nÃ©rique et filtres par paiement. Carte de soin avec icÃ´ne, statut, forfait, mÃ©tadonnÃ©es en colonnes, prix/reste, ordonnance et modification. Filtres natifs par statut rÃ©el de sÃ©ance.
- P1 : tableau de bord sans carte de recettes Stitch. DÃ©gradÃ© bleu/vert, objectif configurable localement, quatre indicateurs compacts et actions en deux colonnes. Aucun objectif fictif sur les comptes rÃ©els.
- P2 : planning trop volumineux. Semaine compacte, numÃ©ro ISO, marqueurs issus des rendez-vous et filtre praticien. Horaire des rendez-vous lu depuis starts_at plutÃ´t que session_date.
- P2 : fiches clients et catalogue gÃ©nÃ©riques. Cartes dÃ©diÃ©es clients, services, forfaits et paiements ; en-tÃªte patient compact dans les historiques ; carte de service avec galerie et impression partagÃ©e entre dossier natif et aperÃ§u.
- P2 : formulaires. IcÃ´nes dans les champs dâ€™identitÃ©, unitÃ©s dans les champs de prix et durÃ©e, compteur compact et estimation recalculÃ©e. Lâ€™image clinique utilise lâ€™asset fourni par Stitch.
- P1 : boutons imbriquÃ©s sur web. Racines des cartes sÃ©parÃ©es de leurs actions ; aucun bouton imbriquÃ© sur la capture finale des sÃ©ances.

## Interactions constatÃ©es

Nouvelle sÃ©ance ouvre une page de formulaire avec la barre infÃ©rieure visible. Plus peut Ãªtre ouvert depuis cette page ; le glissement du bandeau vers le bas le ferme et conserve le formulaire. Le compteur passe de 6 Ã  7 sÃ©ances et lâ€™estimation de 2 700 Ã  3 150 DH. Le planning passe de la semaine ISO 13 Ã  14 et affiche la semaine suivante. Les Ã©critures mÃ©tier, suppressions, rÃ¨glements et demandes de camÃ©ra nâ€™ont pas Ã©tÃ© exÃ©cutÃ©s pendant cette QA.

## DiffÃ©rences de donnÃ©es et limites

Les donnÃ©es de dÃ©monstration restent isolÃ©es dans /design-preview. Les listes rÃ©elles, statuts, compteurs et permissions viennent du backend. Les exportations contiennent des exemples de patients, diagnostics, photos, certifications et cabines qui ne sont pas des donnÃ©es du compte connectÃ© ; ces informations ne sont pas inventÃ©es. Les agrÃ©gats financiers absents sont affichÃ©s Â« â€” Â». Les captures de formulaires de crÃ©ation montrent les rÃ©fÃ©rences non encore sÃ©lectionnÃ©es. La galerie sans photos conserve un Ã©tat vide. Les variations de contenu, dates et droits expliquent des diffÃ©rences entre maquettes et application.

P3 : rÃ©glages fins de typographie, contenus de sous-titres et longueur des titres selon les donnÃ©es. Les Ã©crans gardent la navigation et les zones sÃ»res natives demandÃ©es par lâ€™utilisateur, mÃªme si la rÃ©fÃ©rence ne les reprÃ©sente pas. La feuille dâ€™impression Android appartient au systÃ¨me.

## VÃ©rifications techniques

107 tests / 17 suites rÃ©ussis ; TypeScript et ESLint rÃ©ussis ; export Android/Hermes final rÃ©ussi (1 682 modules). Le dÃ©gradÃ© natif utilise React Native et ne nÃ©cessite pas un nouveau module natif. Le scanner camÃ©ra est chargÃ© uniquement si ExpoCamera est prÃ©sent ; sur un ancien development build, une saisie manuelle reste disponible. Scanner camÃ©ra et impression demandent une reconstruction du development build si leurs modules nâ€™y sont pas installÃ©s.

Ã€ vÃ©rifier sur tÃ©lÃ©phone : les autres rÃ´les, le scanner camÃ©ra, les ajouts de photos et lâ€™impression systÃ¨me. Le parcours Admin a maintenant Ã©tÃ© testÃ© sur lâ€™Ã©mulateur Android, comme dÃ©taillÃ© ci-dessous.

## Validation authentifiÃ©e sur Ã©mulateur Android

Medium_Phone_API_35 a Ã©tÃ© lancÃ© le 8 octobre 2026. Compilation native x86_64 rÃ©ussie avec Gradle assembleDebug : 709 tÃ¢ches, build de dÃ©veloppement com.quickpharma.mobile.dev ; APK dans android/app/build/outputs/apk/debug/app-debug.apk. Aucun expo prebuild exÃ©cutÃ© : la rÃ©gÃ©nÃ©ration a Ã©tÃ© refusÃ©e par la validation automatique et la compilation du projet natif existant a permis de continuer sans modifier les sources Android.

AprÃ¨s autorisation de lâ€™utilisateur, emulator-5554 est passÃ© Ã  Â« device Â» et le pilotage ADB a permis le test natif. Le module RNCDatePicker Ã©tait absent du premier APK Ã  cause dâ€™un cache dâ€™autolinking ancien. Le cache gÃ©nÃ©rÃ© a Ã©tÃ© recalculÃ©, puis ses chemins normalisÃ©s vers le lecteur court Q: pour Ã©viter la limite Windows et les conflits de racines C:/Q:. La nouvelle compilation a rÃ©ussi : 536 tÃ¢ches, 3 min 48 s. APK installÃ©, dÃ©marrage rÃ©ussi et connexion rÃ©ussie avec le compte de test fourni ; la session est restaurÃ©e aprÃ¨s redÃ©marrage. Aucun mot de passe nâ€™est enregistrÃ© dans ce rapport.

Ã‰crans natifs effectivement consultÃ©s : tableau de bord CRM, sÃ©ances, formulaire de nouvelle sÃ©ance et calendrier Android, planning et changement de semaine, liste clients, dossier et historique des services, aperÃ§u dâ€™impression, catalogue de services et fiche dÃ©taillÃ©e, catalogue des forfaits et fiche dÃ©taillÃ©e, forfaits clients et fiche dÃ©taillÃ©e, formulaire de rÃ¨glement et liste des paiements. Captures `native-*.png` et arbres dâ€™accessibilitÃ© associÃ©s dans `.cache/design-qa/`. La barre infÃ©rieure affiche Accueil, Stock, Notifs, Plus dans les listes, fiches et formulaires. Plus se ferme par glissement du bandeau vers le bas et conserve le formulaire affichÃ©.

Corrections issues de cette vÃ©rification native : la durÃ©e des rendez-vous utilise les horaires rÃ©els avant la durÃ©e par dÃ©faut du catalogue (60 et 120 minutes constatÃ©es), le formulaire affiche Â« Nouvelle sÃ©ance Â», les rÃ©fÃ©rences longues de paiement restent sur une ligne, et une photo en Ã©chec affiche Â« Photo indisponible Â» avec RÃ©essayer au lieu dâ€™une zone blanche. Une photo du compte reste indisponible : la rÃ©cupÃ©ration de son fichier nâ€™a pas Ã©tÃ© confirmÃ©e. Lâ€™aperÃ§u dâ€™impression a Ã©tÃ© ouvert, sans lancement dâ€™impression systÃ¨me.

TypeScript et ESLint passent aprÃ¨s ces corrections ; 107 tests / 17 suites passent. Aucun enregistrement, encaissement, ajout de photo ou suppression mÃ©tier effectuÃ©. Cette vÃ©rification confirme le fonctionnement des parcours consultÃ©s pour Admin ; elle ne constitue pas une validation de tous les rÃ´les ni une certification de fidÃ©litÃ© pixel par pixel de tous les Ã©crans Stitch.


## Reprise du 9 octobre â€” corrections des 11 points

Cette section remplace les rÃ©sultats antÃ©rieurs pour les composants modifiÃ©s. ContrÃ´le natif authentifiÃ© sur Medium_Phone_API_35, rendu GPU host, Metro sur 8082 (ADB reverse 8081 et 8082). Les donnÃ©es sont celles du compte de test ; aucune donnÃ©e mÃ©dicale rÃ©elle ajoutÃ©e.

- En-tÃªtes CRM : logo retirÃ© dans les listes, fiches, formulaires et dossier. La barre Accueil / Stock / Notifs / Plus reste inchangÃ©e.
- Actions : Modifier, Encaisser/Convertir et Supprimer regroupÃ©s dans une seule zone. ContrÃ´le natif des fiches service, forfait et sÃ©ance, captures `service-detail-actions`, `package-detail-final`, `session-extra-visible-final`.
- Couleurs : palette avec noms et sÃ©lection visible, sans champ Hex imposÃ© ; compteur +/âˆ’ pour service et composition de forfait. `layer-swiped`, `package-counter-visible` et `package-counter-increment` (4 â†’ 5, modification annulÃ©e).
- Rapports : carte de recettes, graphique dÃ©filant, nouveaux/fidÃ¨les clients, performances et RDV issus des agrÃ©gats API. `reports-native-final` : 521 encaissÃ©, 5 nouveaux clients, 1 fidÃ¨le. Aucun export Stitch dÃ©diÃ© aux rapports trouvÃ© ; adaptation du langage graphique du tableau de bord, pas une reproduction exacte inexistante.
- Paiements : `payments-native-final` confirme Default Customer + TEST, sans rÃ©fÃ©rence UUID en titre. Le patch PHP local enrichit aussi les relations service/forfait dans PaymentResource pour les rÃ´les sans lecture du catalogue ; ce patch nâ€™est pas dÃ©ployÃ© sur le serveur distant.
- Historique : `history-native-final` confirme client, soin, date et auteur. Le backend ne fournit pas dâ€™entrÃ©e Historique au menu de ce rÃ´le : aucune entrÃ©e supplÃ©mentaire nâ€™est inventÃ©e ; Ã©cran contrÃ´lÃ© par son lien interne autorisÃ© et accessible via le dossier.
- Champ supplÃ©mentaire : crÃ©ation native Note DEMO mobile, ordre vide normalisÃ© Ã  0, sauvegarde rÃ©ussie. Valeur saisie dans le formulaire de sÃ©ance puis retrouvÃ©e aprÃ¨s rÃ©ouverture : `session-extra-visible-final`.
- Ordonnance : une ligne fictive enregistrÃ©e via le formulaire de sÃ©ance, relue dans lâ€™onglet Ordonnances, aperÃ§u natif et impression systÃ¨me ouverts : `prescription-preview-final`, `prescription-system-preview`. Aucun fichier exportÃ© ni impression physique lancÃ©e.
- Dossier : structure patient / RDV / statistiques / forfaits / sÃ©ances et onglet Ordonnances. Les quatre statistiques suivent le contrat du web (encaissÃ©, sÃ©ances, rendez-vous, forfaits) ; pas de solde global inventÃ© Ã  partir des cinq derniÃ¨res sÃ©ances. Pas de photo ou dâ€™allergie inventÃ©e.
- Plus : modules issus de `/access/me`, ordre et libellÃ©s du backend, filtrÃ©s par permissions et visibilitÃ©. Profil, notifications et abonnement restent dans la section du compte ; tests des menus absents, cachÃ©s et des droits rÃ©voquÃ©s. Aucun changement du compte ou de ses rÃ´les pour le test.

Comparaisons rÃ©unissant les deux images Ã  411 px de largeur : `comparaison-dossier-9oct.png` (Stitch/mobile), `comparaison-rapports-9oct.png`, `comparaison-actions-9oct.png` (captures avant/mobile). DiffÃ©rences voulues : absence de logo demandÃ©e, donnÃ©es fictives rÃ©ellement enregistrÃ©es, statistiques du contrat web, navigation infÃ©rieure native conservÃ©e.

VÃ©rifications finales : TypeScript et ESLint rÃ©ussis ; 19 suites / 113 tests rÃ©ussis ; PHP syntaxe rÃ©ussie pour PaymentsController et PaymentResource. La crÃ©ation/sauvegarde/rÃ©ouverture du champ texte et de lâ€™ordonnance est testÃ©e sur Android. Tous les types de champs supplÃ©mentaires et tous les rÃ´les nâ€™ont pas Ã©tÃ© testÃ©s en conditions rÃ©elles. Pas de certification pixel par pixel de chaque Ã©cran.


## Correction du cache des menus â€” 9 octobre

Le login et check-token renvoient lâ€™arbre des menus dans `data.permissions`. Cet arbre est dÃ©sormais conservÃ© dans la session SecureStore et utilisÃ© par Plus. Une liste vide explicitement reÃ§ue ne dÃ©clenche pas un retour Ã  un autre arbre. Le contrÃ´le de session remplace les menus par ceux du rÃ´le courant. Suppression du refetch Ã  chaque ouverture et du polling de `/access/me` ; les droits dÃ©taillÃ©s (absents du payload de login actuel) sont chargÃ©s une fois par Ã©tablissement, gardÃ©s en cache et actualisÃ©s sur invalidation explicite ou refus serveur. Les changements dâ€™Ã©tablissement et dÃ©connexions vident toujours les caches.

Validation : 20 suites / 117 tests rÃ©ussis, TypeScript et ESLint rÃ©ussis. Test de rÃ©ouverture : une seule lecture rÃ©seau, seconde lecture uniquement aprÃ¨s invalidation. Tests du stockage des menus login, remplacement lors de check-token et conservation dâ€™un arbre vide.


## Correction du cache des menus â€” 9 octobre

Le login et check-token renvoient lâ€™arbre des menus dans `data.permissions`. Cet arbre est dÃ©sormais conservÃ© dans la session SecureStore et utilisÃ© par Plus. Une liste vide explicitement reÃ§ue ne dÃ©clenche pas un retour Ã  un autre arbre. Le contrÃ´le de session remplace les menus par ceux du rÃ´le courant. Suppression du refetch Ã  chaque ouverture et du polling de `/access/me` ; les droits dÃ©taillÃ©s (absents du payload de login actuel) sont chargÃ©s une fois par Ã©tablissement, gardÃ©s en cache et actualisÃ©s sur invalidation explicite ou refus serveur. Les changements dâ€™Ã©tablissement et dÃ©connexions vident toujours les caches.

Validation : 20 suites / 117 tests rÃ©ussis et TypeScript rÃ©ussi. Test de rÃ©ouverture : une seule lecture rÃ©seau, seconde lecture uniquement aprÃ¨s invalidation. Tests du stockage des menus login, remplacement lors de check-token et conservation dâ€™un arbre vide.


## Accueil par rÃ´le et menus non rÃ©alisÃ©s â€” 9 octobre

`default_route` est utilisÃ© Ã  la connexion et lors de la restauration : route CRM connue vers sa page native, `/services-crm` vers lâ€™accueil CRM, `/superadmin/dashboard` vers lâ€™accueil plateforme, autres pages disponibles vers leur Ã©cran natif. Une route explicite inconnue ou une route CRM sans droit ne retombe plus sur le tableau des ventes. Le tableau SuperAdmin prÃ©sente les Ã©tablissements, utilisateurs, abonnements, revenus rÃ©currents et activitÃ© du jour issus des mÃªmes endpoints globaux que le web (`superadmin/overview`, `superadmin/dashboard/snapshot`), sans contexte dâ€™Ã©tablissement. Les pages dâ€™administration dÃ©taillÃ©es restent grisÃ©es lorsquâ€™elles nâ€™existent pas sur mobile.

Plus conserve tous les menus visibles transmis au rÃ´le par le backend, dans leur ordre et hiÃ©rarchie. Les routes sans Ã©cran mobile sont dÃ©sactivÃ©es et portent Â« Ã€ dÃ©velopper sur mobile Â». Une page rÃ©alisÃ©e sans permission est dÃ©sactivÃ©e avec Â« AccÃ¨s non autorisÃ© Â». Les menus explicitement hidden restent masquÃ©s comme sur le web ; aucune entrÃ©e dâ€™un autre rÃ´le nâ€™est inventÃ©e. Les menus dÃ©jÃ  disponibles, dont Abonnements, restent actifs. Capture native : `all-menu-translated-final.png` (16 modules gÃ©nÃ©raux, puis modules CRM plus bas). Barre infÃ©rieure inchangÃ©e, aucun refetch Ã  chaque ouverture.

VÃ©rification en direct avec le compte Admin fourni pour le menu. Les comptes Service et SuperAdmin nâ€™ont pas Ã©tÃ© connectÃ©s en direct ; leurs redirections et le contrat de donnÃ©es du tableau plateforme sont couverts par les tests automatisÃ©s. Lâ€™Ã©cran plateforme mobile reprend les indicateurs du web, pas lâ€™intÃ©gralitÃ© de ses tables dâ€™administration.

Les menus visibles sans route sont aussi affichÃ©s et dÃ©sactivÃ©s. Validation finale de cette reprise : 21 suites / 125 tests, TypeScript et ESLint rÃ©ussis.

# IntÃ©gration Stitch Ventes / POS â€” 10 octobre 2026

RÃ©sultat final : validÃ© pour les parcours contrÃ´lÃ©s ; reproduction adaptÃ©e aux donnÃ©es et permissions disponibles. La camÃ©ra physique et les pourcentages Google Play restent Ã  vÃ©rifier hors de ce contrÃ´le local. Ce compte rendu concerne les 11 nouveaux exports Ventes/POS et ne remplace pas les rÃ©serves du rapport CRM prÃ©cÃ©dent.

## RÃ©fÃ©rences et comparaison

Source : `C:/Users/badz_/Desktop/Bureau/reactNative/stitch_quickpharma_logo_integration/cran_*` (exports HTML et PNG). Comparaisons persistantes : `docs/design-qa-sales/comparison-01.png` Ã  `comparison-11.png`, rÃ©fÃ©rence Ã  gauche, rendu Ã  droite, normalisÃ©s Ã  390 px de largeur. Les captures Android sont dÃ©barrassÃ©es de la barre d'Ã©tat systÃ¨me. Les confirmations et le reÃ§u utilisent les mÃªmes noms et montants de dÃ©monstration que Stitch dans une galerie rÃ©servÃ©e au dÃ©veloppement, sans appel de crÃ©ation. Les autres captures montrent les donnÃ©es du compte rÃ©el de test : leur contenu diffÃ¨re donc de la rÃ©fÃ©rence. Scanner : comparaison de l'Ã©tat permission non accordÃ©e avec la rÃ©fÃ©rence camÃ©ra active, pas une preuve du dÃ©codage physique. Paiement : capture aprÃ¨s dÃ©filement vers les montants.

| Export | ImplÃ©mentation | VÃ©rification |
| --- | --- | --- |
| 1 Liste des ventes | SalesScreen | Android final : cartes, filtres, 20/50 chargÃ©es, navigation |
| 2 Nouvelle vente / produits | SaleCheckout | Android final : stock, panier, pied de page horizontal |
| 3 SÃ©lection client | SalesCustomers | Android final : six clients, sÃ©lection et confirmation |
| 4 Scanner produit | PosScanner / PosScannerCamera | Permission, saisie manuelle, chargement camÃ©ra diffÃ©rÃ© |
| 5 Panier | SaleCheckout | Android : quantitÃ©, sous-total, changer client, continuer |
| 6 Paiement | SaleCheckout | Android : intÃ©gral 240 DH, restant zÃ©ro ; test automatisÃ© du paiement partiel |
| 7 Confirmation vente | SaleDetail | Galerie sans Ã©criture, montants 186/200/14 ; 320/390/768 px |
| 8 DÃ©tail vente | SaleDetail | Android final : vente existante, articles, synthÃ¨se, boutons PDF/partage |
| 9 Encaisser crÃ©dit | CreditCollection | Android final : dette 133,20 DH, boutons visibles ; aucune soumission rÃ©elle |
| 10 Confirmation rÃ¨glement | CreditConfirmation | Galerie sans Ã©criture, imputation 100+50, 320/390/768 px ; test du solde partiel |
| 11 ReÃ§u | SaleReceipt / SaleDocuments | Galerie 320/390/768 px et Android final : papier, articles, aperÃ§u PDF une page |

## Constatations et corrections

- P1, corrigÃ© : les boutons de pied de page des dÃ©tails et crÃ©dits pouvaient se comprimer sur Android. Le conteneur occupe dÃ©sormais toute la largeur ; capture finale vÃ©rifiÃ©e.
- P1, corrigÃ© : le reÃ§u pouvait conserver la position de dÃ©filement du dÃ©tail. Le changement d'Ã©cran rÃ©initialise le conteneur ; ouverture au dÃ©but du reÃ§u vÃ©rifiÃ©e.
- P1, corrigÃ© : un rÃ¨glement partiel pouvait afficher zÃ©ro depuis un rÃ©sumÃ© serveur incomplet. La confirmation recharge le crÃ©dit rÃ©el ; le test vÃ©rifie 120 - 40 = 80 malgrÃ© un rÃ©sumÃ© retournant zÃ©ro.
- P2, corrigÃ© : cartes de vente trop hautes et pied produits vertical. Badge intÃ©grÃ© Ã  l'en-tÃªte de carte, informations regroupÃ©es et total/action cÃ´te Ã  cÃ´te.
- P2, corrigÃ© : modes de paiement bruts `card`/`credit`. Affichage franÃ§ais des libellÃ©s serveur, avec test de compatibilitÃ©.
- P2, adaptation documentÃ©e : densitÃ© plus aÃ©rÃ©e, tailles tactiles natives et conservation du menu infÃ©rieur existant. Titres, blocs, couleurs et ordre du parcours suivent les exports ; pas d'affirmation pixel par pixel.
- P2, adaptation documentÃ©e : images produits/client, CIN, caisse, catÃ©gorie, plafond de crÃ©dit et certification DGI/HDS ne sont pas inventÃ©s quand l'API ne les fournit pas. IcÃ´nes locales et initiales remplacent les images absentes. Aucun logo miniature ajoutÃ© en haut des dÃ©tails.
- P2, adaptation documentÃ©e : statistiques et filtres financiers portent explicitement sur les ventes chargÃ©es. Les pÃ©riodes sont envoyÃ©es au backend. Pas de chargement intÃ©gral pour produire des totaux supposÃ©s globaux.

## Typographie, couleurs, adaptation, interactions

Police native cohÃ©rente, bleu `#00417c`, teal `#006a63`, mint `#72f4e7`, fond `#f8f9ff`, cartes blanches, sous-blocs bleu pÃ¢le et badges de statut. Titres et montants ont une hiÃ©rarchie distincte. Les zones tactiles disposent de libellÃ©s accessibles et les actions invalides/en cours sont dÃ©sactivÃ©es. Les montants et rÃ©fÃ©rences longs sont limitÃ©s ou rÃ©duits pour tenir dans leur conteneur.

ContrÃ´le natif : Medium_Phone_API_35, 1080Ã—2400, densitÃ© 420 (~411 dp). Confirmations et reÃ§u : largeur du document Ã©gale au viewport Ã  320, 390 et 768 px, aucune extension horizontale observÃ©e. Les listes ont une largeur maximale sur grand Ã©cran. Les formulaires restent dÃ©filables au-dessus des actions fixes et du menu. Les captures web servent au contrÃ´le responsive des trois vues de dÃ©monstration, pas Ã  certifier tous les appareils Android.

## Performance et validation

27 suites / 162 tests rÃ©ussis ; TypeScript et ESLint validÃ©s. Compilation `assembleRelease` x86_64 finale rÃ©ussie, APK installÃ© et dÃ©marrÃ© avec la session existante. Listes virtualisÃ©es/paginÃ©es, recherche temporisÃ©e, requÃªtes annulables et cache des rÃ©fÃ©rentiels ; camÃ©ra chargÃ©e uniquement Ã  l'ouverture et suspendue en arriÃ¨re-plan. Soumissions sans retry automatique, clÃ© d'idempotence de vente conservÃ©e, contrÃ´les de droits et stock avant envoi.

R8 et rÃ©duction de ressources actifs, fichier `mapping.txt` gÃ©nÃ©rÃ©. DEX non compressÃ© local : 12,02 Mio ; APK de contrÃ´le x86_64 : 43,80 Mio. Ces mesures ne prÃ©disent pas les scores de Google Play ni la taille de tÃ©lÃ©chargement d'un AAB toutes architectures.

Aucune vente ni aucun rÃ¨glement crÃ©Ã© sur le compte pendant ce contrÃ´le. Les confirmations ont Ã©tÃ© testÃ©es avec des donnÃ©es isolÃ©es rÃ©servÃ©es au dÃ©veloppement et par tests automatisÃ©s. Aucun dÃ©ploiement Google Play effectuÃ©. Lecture de codes-barres sur matÃ©riel rÃ©el, publication AAB et analyse Google Play non rÃ©alisÃ©es.

# ContrÃ´le tablette â€” 10 octobre 2026

RÃ©sultat : parcours Android contrÃ´lÃ©s utilisables aux formats tablette testÃ©s. ContrÃ´le rÃ©alisÃ© sur l'APK natif de release dans l'Ã©mulateur existant, en modifiant temporairement la taille/densitÃ© Android : 800Ã—1280 dp portrait, 1280Ã—800 dp paysage et 600Ã—960 dp compact. Ce sont des contrÃ´les de viewports Android natifs, pas des tests sur trois tablettes physiques diffÃ©rentes.

VÃ©rifications : liste Ventes, produits, ajout au panier local, passage au paiement, conservation du panier/total 240 DH aprÃ¨s changement de format, champ montant avec IME tablette visible, dÃ©filement paysage, stock, menu, liste clients CRM, formulaire client et tableau de bord CRM compact. Les confirmations et le reÃ§u avaient dÃ©jÃ  Ã©tÃ© contrÃ´lÃ©s Ã  768 px dans la galerie de dÃ©veloppement. Aucune nouvelle vente, crÃ©ation de client ou opÃ©ration financiÃ¨re soumise pendant le contrÃ´le tablette.

Corrections : Ã©tapes POS centrÃ©es et limitÃ©es Ã  680 dp ; pieds d'actions POS centrÃ©s ; pieds de formulaire CRM limitÃ©s Ã  680 dp avec boutons cÃ´te Ã  cÃ´te, afin d'Ã©viter leur Ã©tirement sur toute la tablette. VÃ©rification finale Android : actions CRM centrÃ©es en paysage et accessibles en compact ; pied produits toujours accessible sur tÃ©lÃ©phone 411 dp aprÃ¨s correction. Le menu infÃ©rieur et les permissions backend sont conservÃ©s.

Configuration : orientation `default` / manifeste Android `unspecified` dÃ©jÃ  prÃ©sents ; `ios.supportsTablet` activÃ© pour les prochains builds iOS, conformÃ©ment Ã  la documentation Expo 57 : https://docs.expo.dev/versions/v57.0.0/config/app/#supportstablet. Aucun test iPad natif rÃ©alisÃ© depuis Windows. Le multitÃ¢che et les claviers d'autres fabricants/tablettes physiques restent Ã  vÃ©rifier avant de certifier ces appareils.

TypeScript, ESLint et format des fichiers modifiÃ©s validÃ©s. RÃ©gression complÃ¨te : 27 suites, 162 tests rÃ©ussis. APK x86_64 optimisÃ© final compilÃ© avec succÃ¨s en 1 min 29 s et installÃ©. R8 et rÃ©duction des ressources restent activÃ©s. Captures natives : `.cache/design-qa/tablet-*.png`. Planche persistante : `docs/design-qa-sales/tablet-verification.png`.

Ã‰mulateur restaurÃ© Ã  1080Ã—2400 / densitÃ© 420, application ouverte et connectÃ©e ; alias Q: retirÃ©. Pas de serveur Metro ni publication Google Play.

# Correction responsive rÃ©elle des listes â€” 10 octobre 2026

Cette correction remplace la largeur limitÃ©e des listes validÃ©e dans le contrÃ´le tablette prÃ©cÃ©dent : les marges latÃ©rales importantes signalÃ©es par l'utilisateur Ã©taient une adaptation insuffisante.

Listes Ventes, produits POS, panier, sÃ©lection client POS : `ResponsiveList`, FlatList virtualisÃ©e avec 1/2/3 colonnes selon la largeur mesurÃ©e. La liste est remontÃ©e lors d'un changement de nombre de colonnes pour respecter les contraintes FlatList ; panier et choix du client restent dans l'Ã©tat du parcours. Les requÃªtes paginÃ©es et leur cache sont conservÃ©s.

Listes Stock et modules CRM : largeur de page disponible, cartes dans `ResponsiveGrid` mesurÃ©e via onLayout, une colonne compacte, deux en tablette portrait et trois sur grand paysage. Les cellules gardent une largeur lisible et les clÃ©s des enregistrements. Les pages gardent leurs paginations existantes ; aucun ajout d'appel de menu/API pour la disposition. Les pages de formulaire, confirmations et reÃ§us conservent leur largeur de lecture. Le menu infÃ©rieur est inchangÃ©.

VÃ©rification sur APK natif final : 800Ã—1280 dp, ventes et clients sur deux colonnes alignÃ©es entre les marges de 16 dp ; 1280Ã—800 dp, ventes, stock, clients CRM et produits POS sur trois colonnes pleine largeur ; 600Ã—960 dp et tÃ©lÃ©phone, retour Ã  une seule colonne. Article P9 et total 240 DH conservÃ©s entre les dispositions portrait/paysage, sans crÃ©ation de vente. Captures stabilisÃ©es utilisÃ©es, les captures initiales pendant le dÃ©marrage ne sont pas les preuves finales.

TypeScript et ESLint validÃ©s, 27 suites / 162 tests rÃ©ussis. APK optimisÃ© compilÃ© en 1 min 8 s, installÃ© et dÃ©marrÃ©. Les captures du Stock reflÃ¨tent les libellÃ©s de la session existante. Planche avant/aprÃ¨s : `docs/design-qa-sales/tablet-responsive.png`, captures natives `responsive-*.png` dans `.cache/design-qa`. Aucun test iPad physique et aucune publication. Ã‰mulateur restaurÃ© au format tÃ©lÃ©phone, alias Q: retirÃ©.


## CRM responsive complet â€” 10 octobre 2026

Les pages CRM utilisent dÃ©sormais la largeur de leur conteneur : suppression des plafonds de 560/600 px sur les Ã©crans CRM et panneaux natifs. Les formulaires, fiches, rapports, tableau de bord et aperÃ§u du dossier disposent de sections en grille, jusquâ€™Ã  deux colonnes ; les onglets du dossier et listes de rÃ©fÃ©rences utilisent jusquâ€™Ã  trois colonnes. Une section unique utilise toute la largeur. La grille mesure son conteneur et se recalcule aprÃ¨s rotation ; aucune requÃªte rÃ©seau supplÃ©mentaire nâ€™est introduite par le layout. Les graphiques courts rÃ©partissent leurs barres sur la largeur disponible ; les sÃ©ries longues restent dÃ©filables.

Validation : TypeScript et ESLint passent. 27 suites / 162 tests existants passent. Assemblage Android release x86_64 avec la configuration R8 existante rÃ©ussi et APK installÃ© dans lâ€™Ã©mulateur. ContrÃ´les natifs Ã  800 dp portrait, 1280 dp paysage, 600 dp compact et au format tÃ©lÃ©phone : formulaire service portrait/paysage, maintien de la saisie aprÃ¨s rotation, tableau de bord, rapports, dossier client/profil/forfaits, dÃ©tails service, formulaires client, rendez-vous, sÃ©ance, forfait catalogue et forfait client. Les sections supplÃ©mentaires ordonnance/diagnostic/photos de la sÃ©ance restent accessibles par dÃ©filement. Les boutons dâ€™action restent accessibles et le menu infÃ©rieur nâ€™a pas Ã©tÃ© modifiÃ©. Aucun formulaire ni rÃ¨glement nâ€™a Ã©tÃ© enregistrÃ© pendant ces contrÃ´les.

Captures de comparaison : docs/design-qa-sales/crm-tablet-responsive.png. Captures originales : .cache/design-qa/crm-all-*.png (cache local). Lâ€™Ã©mulateur est rÃ©tabli Ã  sa taille/densitÃ© tÃ©lÃ©phone. Les envois de photos, les donnÃ©es dynamiques aprÃ¨s choix du service, tous les types de champs supplÃ©mentaires et une tablette physique/iPad nâ€™ont pas Ã©tÃ© retestÃ©s pour cette adaptation de layout.


## Documents de vente alignÃ©s sur le web â€” 10 octobre 2026

RÃ©fÃ©rences : web src/components/ThermalReceipt.tsx, src/utils/thermalPrinter.ts et src/pages/Sales/hooks/useInvoiceGeneration.ts ; backend resources/views/deliveries/pdf.blade.php. Le mobile propose dÃ©sormais des actions sÃ©parÃ©es PDF de vente / impression du ticket, et tÃ©lÃ©charge le PDF authentifiÃ© depuis le mÃªme endpoint /deliveries/{id}/pdf que le web. Aucun modÃ¨le A4 concurrent nâ€™est gÃ©nÃ©rÃ© cÃ´tÃ© mobile. Le ticket est monochrome, police monospace, largeur 80 mm, avec Ã©tablissement/adresse/tÃ©lÃ©phone, client/date/rÃ©fÃ©rence, colonnes description/quantitÃ©/prix total de ligne, sous-total/TVA/remise/total, mode de paiement, payÃ©/reÃ§u/reste ou monnaie rendue, message de remerciement et Code128 sur le suffixe de la rÃ©fÃ©rence. Lâ€™aperÃ§u mobile reprend ces mÃªmes donnÃ©es ; les trÃ¨s longues ventes sont affichÃ©es progressivement, mais tous leurs articles sont imprimÃ©s. Les valeurs et le texte HTML sont Ã©chappÃ©s. Les symboles de checksum Code128 96â€“102 manquants dans la table du web sont prÃ©sents dans la table mobile.

VÃ©rification : 29 suites / 170 tests passent, TypeScript et ESLint passent ; build Android release optimisÃ© avec R8 rÃ©ussi, installÃ© dans lâ€™Ã©mulateur. AperÃ§u du reÃ§u et impression native contrÃ´lÃ©s pour une vente existante : total 576, reÃ§u 600, rendu 24. Retour depuis le dialogue dâ€™impression fonctionnel. Le fichier de ticket est prÃ©parÃ© avec Print.printToFileAsync en 80 Ã— 297 mm, puis envoyÃ© au dialogue Android ; le format de papier du dialogue dÃ©pend du pilote dâ€™imprimante (lâ€™Ã©mulateur propose Letter). Aucun test avec imprimante thermique physique ni iOS. Aucune vente/rÃ¨glement crÃ©Ã©, aucun document envoyÃ© Ã  un destinataire. Captures : docs/design-qa-sales/sales-web-documents.png.

Limitation constatÃ©e sur le serveur rÃ©el : gÃ©nÃ©ration PDF retourne HTTP 500, JSON Â« mkdir(): Permission denied Â». Reproduit par une requÃªte authentifiÃ©e sur le compte test. Correctif local dans C:/laragon/www/sassApi/app/Http/Controllers/API/PdfController.php : crÃ©er le dossier privÃ© storage/app/mpdf et le fournir comme tempDir Ã  mPDF, au lieu du dossier temporaire par dÃ©faut sous vendor. VÃ©rification php -l et initialisation mPDF locale rÃ©ussies. Le cache storage/app/mpdf est dÃ©jÃ  ignorÃ© par Git. Ce correctif nâ€™a PAS Ã©tÃ© dÃ©ployÃ© sur le serveur distant ; lâ€™impression du PDF complet en production reste Ã  vÃ©rifier aprÃ¨s dÃ©ploiement. Le mobile signale cet Ã©chec au lieu de substituer un PDF diffÃ©rent du web.

### Partage du reÃ§u en image â€” 11 octobre 2026

Le bouton Partager exporte maintenant le papier du reÃ§u en PNG via react-native-view-shot et expo-sharing. Lâ€™export est montÃ© uniquement Ã  la demande, inclut tous les articles sans pagination, les totaux et le code-barres, et exclut les boutons/la navigation. Le fichier temporaire reste dans le cache pour permettre sa lecture par lâ€™application destinataire. Aucun appel au serveur PDF nâ€™est nÃ©cessaire. Le partage dâ€™image est rÃ©servÃ© Ã  lâ€™application native ; le navigateur affiche une explication.

Validation : compilation Android release minifiÃ©e rÃ©ussie, installation sur Medium_Phone_API_35, panneau Android Â« Sharing image Â» avec le ticket complet de SL-MOB-3078, puis annulation sans envoi. Preuve : docs/design-qa-sales/receipt-image-share.png. 30 suites / 173 tests passent, dont un export de 65 articles et les cas de partage PNG/disponibilitÃ©. TypeScript et ESLint passent. Pas de validation sur appareil iOS physique.

### Diagnostic PDF web/mobile â€” 14 octobre 2026

Comparaison du code : le web (SalesDetails/useInvoiceGeneration) et le mobile (printSalePdf) appellent GET /deliveries/{id}/pdf, avec le jeton Bearer, Accept application/json, store_id et lang. La configuration web locale utilise http://127.0.0.1:8000/api, celle du mobile https://appsassbk.quickpharmaapp.com/api.

VÃ©rification en lecture seule du serveur en ligne avec le compte de test et la mÃªme vente : les deux requÃªtes Ã©quivalentes rÃ©pondent HTTP 500, application/json, erreur mkdir(): Permission denied, aucun PDF. Le correctif local de PdfController configure explicitement mPDF avec storage_path('app/mpdf') plutÃ´t que le rÃ©pertoire temporaire par dÃ©faut de vendor. Il reste Ã  dÃ©ployer ce correctif sur le backend en ligne et assurer que le processus PHP peut Ã©crire dans ce dossier. Aucun dÃ©ploiement effectuÃ© depuis cette tÃ¢che. Une installation web utilisant un autre serveur ou lâ€™impression navigateur peut fonctionner indÃ©pendamment ; le fonctionnement du web public nâ€™a pas Ã©tÃ© observÃ© directement.

## Super Admin — 17 octobre 2026

Références : écrans Stitch Super Admin du dossier fourni et contrats des pages web existantes. Vérifications de navigateur Expo aux formats 390×844, 800×1100 et 1280×900 : tableau de bord, liste de magasins, filtre abonnement actif, fiche magasin/statistiques et liste/détail des factures avec le compte Super Admin de l’API locale. Les captures contenant des données réelles sont dans .cache/design-qa-superadmin (ignoré par Git). Les captures fictives partageables sont dans docs/design-qa-superadmin.

Corrections observées : plafond de largeur du contenu supprimé explicitement avec maxWidth 100 %, listes en deux/trois colonnes, fiche à droite de la liste à partir de 1100 px, identité de magasin compacte avant les onglets, tailles d’action accessibles, icônes des indicateurs et statuts de facture lisibles. La planche dashboard-comparison.png compare le haut de la référence et les données locales ; les valeurs métier et certaines sections diffèrent volontairement selon les données disponibles. Le SLA et les incidents fictifs de Stitch ne sont pas présentés comme des faits.

TypeScript et ESLint validés. 38 suites / 211 tests mobiles passent ; 26 tests backend / 133 assertions passent sur une base de test dédiée. Aucun changement frontend web, aucun déploiement. Les nouvelles routes backend sont additives et protégées par rôle/permission.

Statut QA : validation responsive navigateur réalisée, certification de parité visuelle intégrale NON acquise. Tous les écrans Stitch n’ont pas été comparés état par état ; la validation native Android/tablette/iPad, le rendu PDF natif et le profilage de release restent ouverts. La configuration R8 existante est conservée ; aucun nouveau score Play Console n’a été mesuré. Détail du périmètre et des limites : docs/mobile-superadmin.md.

## Correction Accès et abonnements — 17 octobre 2026

L’entrée ouvre maintenant un espace commun avec les neuf onglets du web, filtrés selon les permissions, au lieu du lanceur de tous les modules Super Admin. La matrice des plans est séparée des offres commerciales : comparaison horizontale des versions, fonctionnalités, quotas et essais ; édition des fonctionnalités d’un brouillon avec confirmation et lock_version. Les quotas/essais, la publication et l’impact restent accessibles par « Gérer la version ». Les modules regroupent leurs fonctionnalités et permissions dans des sections dépliables ; les définitions des quotas présentent une portée et une période lisibles.

Navigation : les onglets authentifiés sont démontés quand la session devient anonyme ; une transition entre contexte plateforme et magasin remonte une instance distincte, sans appeler de composant à hooks comme simple callback. Tests de transition authentifié → 401 → Admin → SuperAdmin et de montage/retrait d’en-tête réussis. Tests de matrice : aucun envoi avant confirmation, quotas/essais conservés, version de concurrence envoyée. Suite complète passée (40 suites / 219 tests), puis test supplémentaire de visibilité des onglets réussi. TypeScript et ESLint passent.

Aucun service lancé pour cette correction. Le contrôle visuel natif de ce nouvel espace reste à réaliser ; aucune parité pixel à pixel avec les captures web n’est revendiquée. Les tableaux horizontaux et sections dépliables constituent l’adaptation téléphone ; les données et droits restent fournis par les API existantes.
