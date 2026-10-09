# Ancien plan d’import CRM — remplacé par la saisie mobile

Le 8 octobre 2026, l’utilisateur a demandé de saisir les données dans les formulaires du mobile pour les tester. L’import décrit ci-dessous n’a pas été exécuté. Les enregistrements effectivement créés sont détaillés dans `crm-mobile-form-test.md`.

Officine ciblée : **aminST**, sur le backend utilisé par le compte de test mobile. Aucun enregistrement de ce jeu n’a été créé. L’import passe par les API normales, avec les droits du compte, sans changer les enregistrements existants. Les données sont fictives et identifiables par DEMO ou QP-DEMO-20261008.

## Clients : 8

Sofia El Amrani, Yassine Bennani, Lina Alaoui, Omar Idrissi, Sara Khalifi, Adam Tazi, Nour Mansouri et Mehdi El Fassi. Chaque nom porte « (DEMO) ». Les adresses sont qp-demo-1@example.invalid à qp-demo-8@example.invalid, les téléphones commencent par 000000000 et les CIN par DEMO. Aucun e-mail ou SMS n’est envoyé par l’import.

## Services : 5

| Service DEMO | Prix | Durée | Séances recommandées | État |
|---|---:|---:|---:|---|
| Soin visage hydratant | 450 | 45 min | 4 | Actif |
| Peeling doux | 650 | 30 min | 3 | Actif |
| Massage relaxant | 300 | 60 min | 5 | Actif |
| Bilan peau | 180 | 20 min | 1 | Actif |
| Soin saisonnier | 250 | 30 min | 2 | Inactif |

## Forfaits

Trois modèles DEMO : Éclat visage (4 séances, 1 620), Cure peau neuve (3 séances, 1 755), Bien-être (5 séances, 1 350).

Cinq forfaits clients répartis entre Sofia, Yassine, Lina, Omar et Sara. Des séances liées consomment les forfaits pour afficher des avancements différents. Trois règlements fictifs de forfaits sont prévus : 810, 270 et 1 755, avec références DEMO.

## Séances et rendez-vous

20 séances : 17 terminées, 2 planifiées, 1 annulée. Une séance terminée est datée de septembre 2026 ; les autres sont réparties du 1er au 8 octobre 2026. Paiements complets, partiels et impayés, pour des montants encaissés fictifs de 4 235 au total. Les séances de forfaits utilisent les prix unitaires des forfaits.

12 rendez-vous supplémentaires, du 8 au 12 octobre 2026 : 5 confirmés, 4 en attente, 1 reporté, 1 annulé et 1 absent. Le backend génère aussi les rendez-vous associés aux séances, selon son comportement normal. Les créneaux sont choisis en respectant les réservations déjà présentes ; aucun rendez-vous existant n’est déplacé.

## Effet sur les statistiques

Ces données seront enregistrées sur le serveur réel de l’officine de test : elles augmenteront les compteurs, revenus et soldes affichés. Les montants sont fictifs, dans la devise configurée du compte. Les règlements des séances et forfaits représentent 7 070 au total. Ils n’impliquent aucune transaction bancaire, mais créent des écritures de règlement dans le CRM.

Les entrées existantes sont conservées. Un manifeste local suit les créations réussies afin de reprendre un import interrompu sans les dupliquer. La suppression du jeu n’est pas effectuée automatiquement.

## Blocage actuel

La validation automatique a refusé l’import en masse, surtout les écritures financières, et demande une confirmation explicite de ce volume et de son effet sur les statistiques du backend réel. Le script de préparation ne contient aucun identifiant de connexion ; les identifiants sont fournis uniquement en mémoire au lancement.
