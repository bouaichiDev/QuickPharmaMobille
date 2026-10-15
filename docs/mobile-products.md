# Produits, emplacements et inventaire

Les Ã©crans mobiles utilisent les rÃ©fÃ©rences Stitch du dossier `stitch_quickpharma_logo_integration`. Le catalogue est virtualisÃ© et paginÃ© (24 produits), avec recherche diffÃ©rÃ©e, filtres de disponibilitÃ© et de code-barres, catÃ©gories et fiche dÃ©taillÃ©e. Ã€ partir de 768 dp, une vue tablette spÃ©cifique reprend la grille 5/12â€“7/12 du HTML Stitch : liste compacte, trois indicateurs, code scannable, actions rapides et tableau FIFO. Les modes Large et 50/50 sont disponibles ; entre 600 et 767 dp, le catalogue affiche deux colonnes.

Le formulaire existant est rÃ©utilisÃ© pour crÃ©er et modifier un produit. Les photos, rÃ©fÃ©rences, champs non modifiÃ©s et quantitÃ©s physiques sont conservÃ©s. Les boutons de recherche CRM et la navigation infÃ©rieure ne sont pas modifiÃ©s.

## Parcours

- Le scan dâ€™un code connu ouvre le produit. Un code inconnu demande de sÃ©lectionner explicitement un produit ; lâ€™association conserve sa rÃ©fÃ©rence. Le remplacement exige une confirmation et refuse les doublons. Une saisie manuelle reste disponible si la camÃ©ra est inaccessible.
- Les codes EAN-13 valides et les rÃ©fÃ©rences ASCII Code128 sont rÃ©ellement encodÃ©s. Lâ€™Ã©tiquette imprimable mesure 50 Ã— 30 mm.
- Les emplacements prÃ©sentent les produits et unitÃ©s rÃ©ellement disponibles. Le rayon et la prÃ©cision de bac sont conservÃ©s mÃªme si le produit nâ€™a plus dâ€™unitÃ©s. Les unitÃ©s disponibles de lâ€™Ã©tablissement actif sont dÃ©placÃ©es ensemble.
- Le comptage reste un brouillon : il ne modifie pas le stock. Les Ã©carts exigent un motif ; les surplus de produits pÃ©rissables exigent une date. La validation finale exige un comptage complet et une seconde confirmation, puis ajuste le stock dans une transaction. Un stock modifiÃ© entre-temps bloque la validation. RÃ©pÃ©ter une validation dÃ©jÃ  terminÃ©e ne rÃ©ajuste pas le stock.
- Le rapport PDF rÃ©cupÃ¨re toutes les pages, indÃ©pendamment du filtre ou de la page visible. Lâ€™export Excel utilise SpreadsheetML (fichier XML ouvrable dans Excel), conserve les rÃ©fÃ©rences comme texte et ne gÃ©nÃ¨re aucune formule depuis les donnÃ©es saisies.

## ComplÃ©ments de la vÃ©rification visuelle

- La fiche tÃ©lÃ©phone reprend les sections DCI, TVA/marge, valeur et jauge du stock, code compact, lots FIFO, mouvements et rÃ©glementation. Le lien dâ€™historique des ventes utilise le endpoint existant `/sales/by-product/{id}`.
- Les filtres dâ€™inventaire sont appliquÃ©s cÃ´tÃ© serveur avant pagination ; les compteurs globaux proviennent de lâ€™Ã©tablissement actif. Le paramÃ©trage dâ€™un brouillon modifie son nom et conserve le pÃ©rimÃ¨tre du stock mÃ©morisÃ©. Un inventaire commencÃ© ne peut plus Ãªtre renommÃ©.
- Les emplacements reprennent les cartes par zone, la capacitÃ© configurÃ©e, le code, le dÃ©tail et la prÃ©cision de bac. Les QR sont rÃ©ellement encodÃ©s en UTF-8 et imprimables en 60 Ã— 40 mm ; le scan dâ€™un code dâ€™emplacement ouvre sa zone.
- Sur tablette, la sortie manuelle exige la permission `stock.adjust`, une quantitÃ© disponible, un motif et une seconde confirmation. La transaction retire les unitÃ©s aux dates de pÃ©remption les plus proches et journalise lâ€™acteur et le motif. Aucun stock utilisateur nâ€™a Ã©tÃ© modifiÃ© pendant les tests, rÃ©alisÃ©s dans la base dÃ©diÃ©e.
- Le bouton Commander est affichÃ© grisÃ© : la commande fournisseur ne possÃ¨de pas encore de formulaire mobile. Le menu infÃ©rieur reste inchangÃ©.

## Backend et dÃ©ploiement

Le mobile utilise les endpoints authentifiÃ©s `/mobile-stock/*`, sous les autorisations et le pÃ©rimÃ¨tre dâ€™Ã©tablissement existants. Les prix dâ€™achat et marges sont masquÃ©s cÃ´tÃ© serveur lorsque le rÃ´le nâ€™y a pas accÃ¨s. Les entrÃ©es Inventaire et Emplacements utilisent les menus backend dÃ©jÃ  autorisÃ©s ; aucun appel de menu supplÃ©mentaire nâ€™est ajoutÃ©.

Avant dâ€™utiliser ces Ã©crans sur le VPS, dÃ©ployer `MobileStockController`, les routes et leurs dÃ©finitions dâ€™accÃ¨s, les adaptations compatibles de `ProductController`, puis exÃ©cuter ces quatre migrations avec la procÃ©dure de dÃ©ploiement habituelle :

1. `2026_10_14_120000_add_mobile_stock_workflows.php`
2. `2026_10_14_130000_add_product_location_hint.php`
3. `2026_10_14_140000_add_product_default_location.php`
4. `2026_10_14_150000_add_location_display_metadata.php`
5. `2026_10_15_120000_create_mobile_stock_actions.php`

Ces migrations sont additives et dÃ©jÃ  appliquÃ©es Ã  lâ€™API locale. Aucun dÃ©ploiement VPS ni publication Play Store nâ€™a Ã©tÃ© effectuÃ©. La version et la configuration de production doivent Ãªtre vÃ©rifiÃ©es avant une nouvelle release. R8 et la rÃ©duction des ressources restent activÃ©s.

## VÃ©rification

TypeScript et ESLint passent. La suite mobile compte 185 tests rÃ©ussis (34 suites). Les 13 tests backend ont rÃ©ussi (78 assertions) dans `sasspharmacy_test` exclusivement. Ils couvrent lâ€™isolation des Ã©tablissements, les droits, les doublons, les photos, les emplacements sans stock, la validation atomique et les pÃ©remptions. Le schÃ©ma historique de la base de tests doit contenir la colonne `products.images`, comme la base applicative.

La galerie `/design-preview?view=stock-catalogue` utilise uniquement des donnÃ©es fictives en mÃ©moire et est dÃ©sactivÃ©e en release. Elle permet de contrÃ´ler les Ã©crans sans modifier les donnÃ©es mÃ©tier. Les captures sont dans `docs/design-qa-products`. Les capacitÃ©s, codes et zones peuvent Ãªtre enregistrÃ©s dans le formulaire dâ€™emplacement. Les relevÃ©s de tempÃ©rature restent non renseignÃ©s sans source rÃ©elle ; les donnÃ©es dâ€™exemple de la galerie sont distinctes des donnÃ©es mÃ©tier.

Les listes sont paginÃ©es et les mutations affichent leur progression. Une validation dâ€™inventaire trÃ¨s volumineux peut cependant prendre du temps cÃ´tÃ© serveur ; aucun benchmark sur un inventaire de plusieurs milliers de produits nâ€™a Ã©tÃ© effectuÃ©. Le scan avec camÃ©ra physique et iOS restent Ã  vÃ©rifier.


## Statistiques de catégorie et accès aux emplacements — 15 octobre 2026

Le détail d’une catégorie charge `GET /mobile-stock/categories/{id}/summary?days=30` (30, 90 ou 0 pour tout l’historique). Le stock est actuel ; les opérations suivent la période sélectionnée. Produits liés paginés par 24, avec ouverture du catalogue filtré. Les ventes, entrées et commandes clients présentent le nombre de documents, les unités, le montant brut des lignes de la catégorie et les cinq dernières lignes. Les remises et taxes globales des documents ne sont pas réparties artificiellement : ces montants ne sont pas présentés comme un chiffre d’affaires net. Les lignes supprimées sont exclues. Les droits ventes, entrées, commandes et prix d’achat sont vérifiés côté serveur. L’établissement et la catégorie sont contrôlés pour chaque requête.

Le menu Plus propose Emplacements avec un droit `products.view`, `stock.view` ou `stock.locations.manage`, en cohérence avec l’API de consultation ; les mutations restent soumises à `stock.locations.manage`. Ce raccourci demandé utilise les permissions déjà chargées et ne déclenche pas une requête de menu supplémentaire. Aucun onglet inférieur ajouté.

La validation de modification de catégorie utilise désormais la table réelle `categorys`, avec restriction à l’établissement. Tests backend dédiés : agrégats de documents contenant plusieurs catégories, anciennes opérations hors période, suppression de lignes, coûts masqués, accès étranger refusé et modification scindée par établissement. Vérification des nouveaux parcours par tests de composants ; pas de nouvelle validation sur appareil physique. Aucun déploiement VPS effectué : le nouveau contrôleur, la route et sa définition d’accès devront y être déployés avant usage de ces statistiques en production.


## Correction des sessions et inventaire par produit — 15 octobre 2026

Le journal Laravel local signalait `Unknown column u.name` dans la liste des sessions. La requête utilise désormais `users.firstName` et `users.lastName`, avec un nom vide traité comme non renseigné. Un test crée une session et contrôle le nom complet de son opérateur. L’erreur de requête était indépendante des données de comptage.

Chaque carte produit propose une icône Inventaire, également présente dans la liste compacte tablette. Comme sur le web, elle concerne le produit sélectionné ; elle ouvre un écran de consultation avec les unités disponibles, lots, emplacements et les 20 derniers mouvements via la fiche de stock existante. Accès soumis à `stock.view`. La fiche produit reste accessible et l’emplacement peut être modifié avec `stock.locations.manage`. Les tests vérifient l’action distincte de la carte, le blocage sans droit, et le chargement du bon produit. Les formulaires de gestion des unités sont décrits ci-dessous.


## Gestion complète des unités du produit — 15 octobre 2026

Depuis l’icône Inventaire de la carte produit :

- Ajout de 1 à 1000 unités, avec réception, péremption si nécessaire, fournisseur et emplacement facultatifs.
- Sélection individuelle ou de toute la page ; sélection conservée entre les pages, maximum 1000 unités par opération.
- Modification des dates, fournisseur et emplacement des unités sélectionnées.
- Mise au rebut avec motif ; suppression définitive avec motif et récapitulatif avant confirmation.
- Transfert vers un établissement accessible du même compte et un produit explicitement choisi dans son catalogue. Le produit de destination doit avoir la même gestion de péremption. Les dates sont conservées ; fournisseur, emplacement et liens documentaires du magasin source sont retirés. Les mouvements sortant et entrant sont enregistrés dans les deux établissements.
- Recherche par fournisseur/emplacement, filtre des unités périmées ou sans péremption, et historique complet paginé. Les unités et mouvements sont chargés par 25 ; les listes de choix sont virtualisées.

Droits : `stock.view` pour lire les unités et mouvements, `stock.adjust` pour ajouter/modifier/rebut/supprimer, `stock.transfer` dans les deux établissements pour transférer. Le serveur contrôle chaque sélection entière sous verrou ; une sélection périmée ou contenant un autre produit/établissement annule toute l’opération. Modification du stock et écriture du mouvement sont dans la même transaction. Une erreur d’historique annule les unités créées ; ce cas est testé. Aucun changement des endpoints de gestion du web dans cette évolution.

API : `GET /mobile-stock/products/{id}/inventory`, `GET .../movements`, `GET .../options`, `POST .../actions`. Les actions exigent une confirmation et un UUID stable : rejouer la même confirmation ne modifie pas le stock une deuxième fois. La table additive `mobile_stock_actions` est appliquée localement et dans la base de tests. Pour un autre serveur, déployer la migration, `MobileProductInventoryController`, les routes et les définitions de permissions ensemble.

Vérifications : 204 tests mobiles (36 suites), 24 tests backend stock (193 assertions), TypeScript et ESLint réussis. Les cinq actions ont été jouées dans la galerie fictive isolée, sans écriture métier, sans erreur `pageerror`. Captures à 399 × 900, 800 × 1100 et 1280 × 900 : `docs/design-qa-products/inventory-management-*.png`, `inventory-add-*.png`, `inventory-edit-review.png`, `inventory-transfer-review.png`. Les résumés et formulaires utilisent deux colonnes sur tablette et les unités jusqu’à trois colonnes selon la largeur. La galerie est désactivée en release. Les nouveaux formulaires n’ont pas été rejoués sur un téléphone physique dans cette vérification ; le sélecteur de dates existant est réutilisé. Aucun stock réel ni VPS modifié pendant les tests.
