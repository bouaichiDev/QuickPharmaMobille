# Saisie CRM dans le mobile — 8 octobre 2026

## Complément : plusieurs clients

Quatre clients supplémentaires ont été saisis et enregistrés individuellement dans le formulaire Android : Yassine Bennani DEMO, Lina Alaoui DEMO, Omar Idrissi DEMO et Sara Khalifi DEMO. Ils utilisent respectivement les CIN DEMO0002 à DEMO0005, les téléphones 0000000002 à 0000000005 et des adresses prénom.demo@example.invalid. La liste mobile affiche désormais **6 clients au total : 5 DEMO et Default Customer**. Le nom de Lina a été corrigé via Modifier le client et vérifié dans la liste. Trace finale : `.cache/design-qa/clients-sara-result.xml`. Les statistiques « clients servis » restent distinctes du nombre de fiches clients : les nouveaux dossiers n’ont pas encore de séances.

Compte de test connecté à aminST. Saisie et enregistrement par les contrôles de l’application Android sur emulator-5554, sans import API ni modification du menu inférieur.

## Enregistrements créés et retrouvés dans les listes

| Formulaire | Données enregistrées |
|---|---|
| Nouveau client | Sofia El Amrani DEMO, CIN DEMO0001, téléphone 0000000001, sofia.demo@example.invalid, actif |
| Nouveau service | Soin visage DEMO, prix 450, durée 45 min, 4 séances recommandées, actif |
| Nouveau forfait | Eclat visage DEMO, 4 séances de Soin visage DEMO, prix 1 620 |
| Nouveau forfait client | Sofia, Eclat visage DEMO, prix 1 620, montant encaissé 0 |
| Nouvelle séance | Sofia, Soin visage DEMO, forfait client Eclat visage DEMO, 08/10/2026 18:00–18:45, Terminée, zone Visage, observation DEMO, montant encaissé 0 |
| Nouveau rendez-vous | Sofia, Soin visage DEMO, 09/10/2026 09:00–09:45, Confirmé, note DEMO |

La séance liée au forfait est affichée « Séance 1/4 ». Son prix enregistré est 405, calculé par le backend à partir du forfait (1 620 / 4), alors que le champ avant création proposait encore le tarif du service 450. La séance génère également un rendez-vous lié, distinct du rendez-vous créé manuellement.

## Vérification

- Listes après saisie : 2 clients, 4 services, 3 modèles de forfaits, 3 forfaits clients, 8 séances et 11 rendez-vous.
- Tableau de bord mensuel : 8 séances, 2 clients servis, 1 rendez-vous aujourd’hui, reste à encaisser 747 et 4 règlements en attente. Recettes encaissées inchangées : 521.
- Après fermeture et relance de l’application, Sofia est toujours présente dans Clients & Dossiers avec 1 séance et Réglé : 0.
- Champs texte et numériques, composition du forfait, sélecteurs client/service/forfait/statut, calendrier et saisie d’heure natifs, zone et notes utilisés.
- Aucun règlement supplémentaire enregistré, aucune prescription ajoutée, aucun message envoyé volontairement.

## Limites observées

Les valeurs techniques des statuts du formulaire de rendez-vous sont affichées en anglais (`pending`, `confirmed`, etc.) ; la carte enregistrée affiche correctement « Confirmé ». Le prix proposé dans le formulaire de séance liée diffère du prix final calculé par le backend. Ces observations ne sont pas corrigées dans cette session de saisie.

Les captures ADB produisent une image noire ou corrompue sur cet émulateur ; les vérifications des contrôles et listes sont fondées sur la hiérarchie Android uiautomator. Cette session valide la saisie et la persistance des données, pas la fidélité visuelle à Stitch.

Les traces de contrôles sont conservées dans `.cache/design-qa/mobile-client-result.xml`, `mobile-service-result.xml`, `mobile-package-result.xml`, `mobile-sold-result.xml`, `mobile-session-result.xml`, `mobile-rdv-confirmed.xml`, `mobile-demo-dashboard.xml` et `mobile-clients-final.xml`.


## Complément du 9 octobre : champs et ordonnance

Création via le formulaire Android d’un champ du service Soin visage DEMO : nom `demo_note_mobile`, libellé Note DEMO mobile, type texte, visible, facultatif, ordre laissé vide. Enregistrement réussi après normalisation de l’ordre vide à 0 (corrige l’erreur serveur constatée). La séance de Sofia a été modifiée dans le mobile avec la valeur « Valeur DEMO saisie dans mobile » et une ligne d’ordonnance « Produit DEMO fictif », instructions « TEST FORMULAIRE - DONNEES FICTIVES ». Les autres champs de posologie restent vides. Sauvegarde puis réouverture réussies ; contenu retrouvé dans le détail de séance et dans le dossier client.

L’aperçu d’impression Android de cette ordonnance affiche une page avec le client, le service, la date et la ligne fictive. Aucune impression physique ou export PDF effectué. Preuves : `session-extra-visible-final.png`, `prescription-preview-final.png`, `prescription-system-preview.png` dans `.cache/design-qa/`.

Le compteur du forfait Eclat visage DEMO passe de 4 à 5 avec le bouton + ; modification annulée. Les rapports, paiements et historique ont été consultés dans le mobile avec les données du compte. Contrôle technique final : 113 tests / 19 suites, TypeScript et ESLint réussis. Les autres types de champs personnalisés restent à valider manuellement ; seules leurs normalisations et l’ordre vide sont couverts par les nouveaux tests automatisés.


## Photos CRM — vérification Android du 9 octobre 2026

- Envoi multipart repris du formulaire produit : fichier natif URI/nom/MIME, boundary laissé au transport. Code partagé par les brouillons de séance et les galeries client/forfait.
- Boutons galerie et appareil photo, permission caméra, annulation sans mutation, limite serveur 5 Mo, légende limitée à 500 caractères et réessai de l’envoi sans nouvelle sélection.
- Avant correction, l’envoi créait une photo mais le chargement direct par Image renvoyait HTTP 500. Les aperçus passent maintenant par le client API authentifié (XHR binaire), puis sont affichés en mémoire ; aucun fichier privé n’est rendu public.
- Test dans l’application native, compte de test existant : séance Soin visage DEMO / Sofia El Amrani DEMO, capture de la caméra synthétique de l’émulateur, validation/recadrage, envoi et aperçu réussi. Sélection galerie également enregistrée et visible.
- Dossier Sofia / onglet Forfaits / Eclat visage DEMO : photos associées visibles et ajout direct depuis la galerie réussi. Aucun patient réel photographié.
- Captures locales : `.cache/design-qa/photo-camera-final.png`, `.cache/design-qa/photo-gallery-upload-final.png`, `.cache/design-qa/photo-forfait-upload-visible.png`. Images fictives de test conservées dans le dossier DEMO.
- Vérification : suite mobile complète 131 tests réussis avant ajout du test de lecture binaire ; les 7 tests photo finaux passent, ainsi que TypeScript et lint.
- Aucun changement requis au backend pour ce correctif. Caméra et galerie validées sur Android ; iOS non testé physiquement.
- Metro et émulateur utilisés temporairement pour cette vérification sont arrêtés à la fin.

## Séances et forfaits clients — correctifs du 9 octobre 2026

- Bouton « Voir le détail » ajouté aux forfaits clients, y compris dans le dossier client ; composition et séances utilisées affichées.
- Photos de chaque forfait repliées par défaut ; chargement au clic sur « Afficher les photos avant / après ».
- Boutons de scan retirés des en-têtes et recherches CRM. Navigation du bas conservée.
- Intervenants : utilisateurs nommés, regroupés par rôle. Forfaits proposés uniquement pour le client choisi, actifs, non expirés et avec des séances disponibles.
- Formulaire de séance aligné sur le web : choix service seul masque le forfait ; choix forfait client masque le service et préremplit son service disponible. Choix du forfait catalogue retiré.
- Correction de l’erreur serveur : remise et montant payé facultatifs laissés vides sont envoyés à 0, au lieu de null dans les colonnes non nullables.
- Vérification native : séance autonome créée pour Sofia El Amrani DEMO / Soin visage DEMO, le 09/10/2026 à 12:09, 45 minutes, prix 450, sans forfait. Total des séances passé de 8 à 9.
- Vérification native sans sauvegarde supplémentaire : Eclat visage DEMO, 3 séances restantes, durée préremplie 45 minutes et prix 405. Détail depuis le dossier et ouverture/fermeture des photos vérifiés.
- Vérification technique : suite complète intermédiaire 137 tests réussis ; après les derniers correctifs, 7 tests ciblés réussis (séances et photos repliées), TypeScript et lint réussis.
- Preuves dans .cache/design-qa : crm-session-created-detail.png, crm-forfait-photos-folded-verified.png, crm-forfait-detail-from-dossier.png, crm-pack-prefill-final.png.
