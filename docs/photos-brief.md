# Photos des articles — cahier des charges

Le site sait afficher une **photo optimisée** pour chaque article (cartes de l'accueil, « Articles liés », recherche). Tant qu'un article n'a pas sa photo, il garde son illustration actuelle : rien ne casse.

## Style commun (pour une série cohérente)
- **Photoréaliste**, format **paysage 16:9 ou 3:2**, 1 424 px de large minimum (2 400 px idéal), JPEG ou PNG.
- **Lumière naturelle** douce, ambiance chaleureuse et sobre ; **accent bleu-vert** (celui du site, #046a7a) dans le décor si possible (vêtement, mur, objet), sans filtre coloré.
- **Vraies situations de travail**, adultes de 25 à 55 ans, diversité naturelle, expressions sincères. Pas de poignée de main, pas d'ampoule, pas de fusée, pas de fausses flèches.
- **Aucun texte lisible, logo, marque, écran avec contenu identifiable**.
- Sujet placé **au centre ou à gauche** : le recadrage (cartes 712 × 384 et 712 × 320) coupe un peu le haut et le bas.
- **Droits** : photos libres de droits de stock avec licence commerciale (conservez la preuve de licence), ou images générées par une IA dont les conditions autorisent l'usage commercial. Pour des personnes réelles identifiables : autorisation écrite (droit à l'image).

## Photos à fournir (nom de fichier = adresse de l'article + extension)
| Fichier | Sujet de la photo |
|---|---|
| `combien-coute-la-vae` | Une personne calcule un budget : calculatrice, documents, ordinateur portable sur un bureau |
| `qui-peut-faire-une-vae` | Trois adultes de métiers différents (soin, commerce, artisanat) en tenue de travail, côte à côte |
| `quelles-sont-les-etapes-de-la-vae` | Mains qui cochent une liste d'étapes sur une feuille, ordinateur portable à côté |
| `le-passage-devant-le-jury-une-etape-obligatoire-dans-la-demarche-de-vae` | Une candidate face à trois membres d'un jury, salle de réunion lumineuse |
| `comment-choisir-le-bon-diplome-pour-la-vae` | Une personne compare des diplômes sur ordinateur portable, carnet à la main |
| `le-profil-type-d-un-candidat-a-la-vae-pour-le-deap-diplome-d-etat-d-auxiliaire-de-puericulture` | Auxiliaire de puériculture souriant à un jeune enfant, salle de crèche |
| `faut-il-se-faire-accompagner-pour-sa-vae` | Un conseiller et une candidate relisent un dossier autour d'une table |
| `les-etapes-de-la-vae-et-leur-duree` | Calendrier papier annoté, ordinateur portable, une main entoure une date |
| `la-validation-des-acquis-de-l-experience-vae-un-dispositif-cle-pour-l-evolution-professionnelle` | Une professionnelle tient son diplôme sur son lieu de travail |
| `le-passage-devant-le-jury-pour-une-vae-deroulement-et-conseils-pratiques` | Vue par-dessus l'épaule d'un candidat qui présente son parcours devant un jury |
| `comment-rediger-son-livret-2-pour-une-vae-quelques-conseils` | Une personne rédige son dossier sur ordinateur, classeur et notes ouverts |
| `comment-faire-une-vae-pour-devenir-educateur-specialise` | Un éducateur anime une activité avec un groupe de jeunes |
| `aides-financieres-vae` | Dossier de demande de financement, stylo et calculatrice sur un bureau |
| `obtenir-le-diplome-d-etat-d-auxiliaire-de-puericulture-par-la-vae-qui-peut-en-faire-la-demande` | Auxiliaire de puériculture donne le biberon à un bébé, crèche |
| `est-ce-que-pole-emploi-finance-la-vae-ce-qu-il-faut-savoir` | Demandeur d'emploi échange avec un conseiller à son bureau, agence |
| `le-cpf-pour-financer-la-vae-ce-qu-il-faut-savoir` | Une personne consulte une offre de formation sur ordinateur portable chez elle |
| `comment-obtenir-le-diplome-d-etat-d-aide-soignant-deas-par-la-vae` | Aide-soignante accompagne une personne âgée en établissement de soins |
| `comment-choisir-son-organisme-accompagnateur-vae` | Deux personnes comparent des offres d'accompagnement sur un ordinateur portable |
| `peut-on-faire-une-vae-a-distance` | Une personne casque sur les oreilles en visioconférence depuis son bureau à domicile |
| `une-assistante-maternelle-peut-elle-devenir-auxiliaire-de-puericulture-par-la-vae` | Assistante maternelle joue avec deux enfants dans un salon |

## Comment ajouter les photos (aujourd'hui et pour les prochains articles)
1. Placer chaque photo d'origine dans `photos-source/` avec pour nom **l'adresse de l'article** (ex. `photos-source/combien-coute-la-vae.jpg`). Ces originaux ne sont pas versionnés.
2. Vérifier (ou écrire pour un nouvel article) son **texte alternatif** dans `src/data/imageAlt.js` : une phrase de 125 caractères maximum qui **décrit la photo réellement choisie**.
3. Lancer `python3 scripts/optimize_photos.py` (Pillow requis). Il recadre en 712 × 384, produit 3 tailles WebP (480, 712, 1 424 px, qualité 78, métadonnées retirées) dans `public/images/photos/` et met à jour `src/data/photos.js`.
4. `npm test` contrôle : fichiers présents, poids (≤ 60 / 110 / 300 Ko), texte alternatif, article existant.
5. Pousser les changements : le site utilise la photo, avec `srcset` (le navigateur charge la taille adaptée), chargement différé (`loading="lazy"`) et dimensions déclarées (pas de saut de mise en page).

**Nouvel article** : même chemin (photo + texte alternatif + script). Sans photo, l'article reçoit automatiquement une illustration (`npm run images`).
