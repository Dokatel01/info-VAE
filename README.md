# Info VAE : site Astro (étape 2 : page d'accueil complète)

Cette version contient **toute la page d'accueil** : en-tête, navigation, héro, « Comment fonctionne
la VAE ? » (avec la carte conseillers sticky), « Articles en vedette », appel à l'action, section
d'information avec formulaire, et pied de page.
Les pages d'articles et l'intégration Google Docs / Google Sheets ne sont **pas** encore développées.

## Mettre à jour votre dossier et lancer le site

1. **Remplacez** votre ancien dossier `info-vae` par celui de l'archive `info-vae.zip` (décompressée).
2. Ouvrez un terminal **dans le dossier `info-vae`**.
3. **Installez les dépendances** (nécessaire seulement la première fois, ou si `package.json` change) :
   ```
   npm install
   ```
   Cette étape n'ajoute aucune dépendance par rapport à l'étape 1 : si vous l'avez déjà faite, vous
   pouvez passer directement à la suivante.
4. **Lancez le site** :
   ```
   npm run dev
   ```
5. Ouvrez <http://localhost:4321>. Arrêt du serveur : `Ctrl + C`.

Pour vérifier que le site se construit : `npm run build` (crée un dossier `dist/`).

## Organisation des fichiers

```
src/
  layouts/BaseLayout.astro     Gabarit : en-tête + nav + contenu + pied de page
  pages/index.astro            Page d'accueil (assemble les sections dans l'ordre)
  data/featuredArticles.js     Les 3 articles en vedette (titres, extraits, tags, images, liens)
  components/
    Header, NavBar, Hero       (étape 1, inchangés)
    HowItWorks                 Section « Comment fonctionne la VAE ? »
    AdvisorCard                Carte conseillers (réutilisable : accueil + futures pages d'articles)
    FeaturedArticles           Section « Articles en vedette »
    ArticleCard                Une carte d'article (réutilisable)
    CtaBanner                  « Prêt à vous lancer dans votre projet de VAE ? »
    InfoSession                Section « Info-VAE » + formulaire (réutilisable)
    Footer                     Pied de page
    Icon                       Icônes SVG (phone, clock, mail, webcam, calendar)
  styles/
    variables.css              TOUTES les couleurs, polices et tailles clés
    + un fichier CSS par composant (noms de classes préfixés : pas de conflit entre sections)
public/
  favicon.svg                  Icône d'onglet PROVISOIRE
  images/                      Images PROVISOIRES (voir ci-dessous)
```

## Remplacer les images provisoires

Toutes les images sont dans `public/images/`. Les illustrations actuelles sont **générées et
provisoires** (aucune photo) :

| Fichier | Où il apparaît | Taille conseillée |
|---|---|---|
| `article-eligibilite-diplomes.jpg` | Carte « Qui peut faire une VAE… » | 712 × 384 px |
| `article-aides-financieres.jpg` | Carte « Les aides financières… » | 712 × 384 px |
| `article-cout-vae.jpg` | Carte « Combien coûte une VAE ? » | 712 × 384 px |
| `article-default.jpg` | Image utilisée si un article n'a pas d'image | 712 × 384 px |
| `session-vignette.svg` | Petite vignette de la section d'inscription | 192 × 108 px (affichée à 96 × 54) |

**Pour remplacer une image** : mettez votre fichier dans `public/images/` avec **le même nom**
(ou changez le chemin `image` dans `src/data/featuredArticles.js`). La mise en page ne change pas :
les images sont recadrées automatiquement dans un cadre de 192 px de haut.

## La carte conseillers « sticky »

- Elle est dans `HowItWorks.astro` / `how-it-works.css` (`position: sticky`, `top: var(--sticky-offset)`).
- Elle reste visible pendant le défilement de la section, puis **s'arrête à la fin de la colonne** :
  elle ne recouvre jamais la section suivante.
- Le décalage du haut est `--sticky-offset` dans `variables.css` (24 px aujourd'hui, car on ne sait pas
  si l'en-tête reste fixe sur la référence). Si l'en-tête devient fixe un jour, la ligne de remplacement
  est indiquée en commentaire dans ce fichier.
- Sous **900 px**, la carte repasse en position normale (sinon elle masquerait le texte).
- Attention : le texte à gauche n'est que 138 px plus haut que la carte, donc l'effet dure peu
  (environ 115 px de défilement). C'est inhérent à la mise en page de la référence.
- Règle à respecter : ne jamais mettre `overflow` (hidden, auto, scroll) sur `html`, `body`, `main`
  ou les conteneurs de cette section : cela désactiverait le sticky.

## Ce qui a été vérifié (dans l'environnement de développement de Claude)

Les fichiers `.astro` du projet ont été exécutés par un script de contrôle (hors archive) qui
reproduit le fonctionnement d'Astro, puis la page a été chargée dans un vrai Chromium :

- **Mise en page à 1366 px** : hauteur totale de la page identique à la référence (2447 px) ; toutes
  les sections (héro, section 2, articles, appel à l'action, inscription, pied de page) aux mêmes
  positions et dimensions ; cartes d'articles (357 × 414 px), carte conseillers (362 × 190 px),
  formulaire (540 × 288 px).
- **Couleurs** : 18 points de contrôle (fonds, bordures, boutons, cercles) identiques à la référence.
- **Sticky, avec défilement réel** : la carte se colle à 24 px du haut, s'arrête au bas de sa colonne,
  ne recouvre pas la section suivante (testé à 1366 × 768, 1366 × 900 et 1024 × 768) ; repasse en
  position normale sous 900 px ; aucun ancêtre n'a de propriété qui bloque le sticky.
- **Responsive** : aucun débordement horizontal de 1920 px à 360 px (11 largeurs testées).
- **Formulaire** : champs obligatoires et e-mail contrôlés ; aucun envoi réseau ; message clair.
- **Technique** : aucune erreur dans la console ; aucune image cassée ; 455 déclarations CSS toutes
  valides ; syntaxe du script du formulaire valide.
- **Étape 1 intacte** : l'en-tête, la navigation et le héro sont identiques pixel pour pixel.

## Ce qui n'a PAS été vérifié (à tester de votre côté)

- **`npm install`, `npm run dev` et `npm run build` n'ont pas pu être exécutés** : l'accès au registre
  npm est bloqué dans l'environnement de développement. Le script de contrôle n'est pas Astro :
  si une erreur s'affiche dans votre terminal, copiez-la-moi.
- **La police** : le site utilise la police système (Segoe UI sur Windows, comme la référence).
  Mon contrôle a utilisé une police de remplacement : les retours à la ligne des textes peuvent donc
  différer légèrement de ce que vous verrez. Chez vous, sur Windows, ils devraient correspondre à la
  référence ; sur Mac, la police diffère de la référence (normal).
- **Le défilement dans votre navigateur** : le sticky est testé, mais regardez-le chez vous
  (faites défiler lentement à partir du haut de la section « Comment fonctionne la VAE ? »).
- **Les photos de la référence** : non reproduites (voir « images provisoires »).
- **Survol, clic, clavier** : non visibles sur une capture, donc choisis par défaut (légère
  transparence sur les boutons des cartes, soulignement des liens du pied de page).
- **Icônes** : redessinées d'après la capture (visio, calendrier, téléphone, horloge, courrier) ;
  proches mais pas forcément identiques.

## À connecter plus tard

- **Formulaire d'inscription** : il contrôle les champs mais n'envoie rien. Il affiche « Formulaire non
  connecté pour le moment : aucune donnée n'a été envoyée. » Il faudra le relier à un service
  d'inscription.
- **Liens** : tous les boutons et liens pointent vers « # », sauf « Combien coûte la VAE » (page
  `/combien-coute-la-vae`, qui n'existe pas encore), le téléphone (`tel:`) et l'e-mail (`mailto:`).
  « Voir plus » et « Plus d'infos » pointent vers la même adresse en attendant les pages d'articles.
- **Bouton menu orange, « Ressources », « Contact », recherche** : sans action pour l'instant.
- **Titre d'onglet, favicon, texte « ... » du 2e article** : provisoires à confirmer.
