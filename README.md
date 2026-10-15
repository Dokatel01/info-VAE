# Info VAE : site Astro (étape 3 : pages d'articles, recherche, catégories)

Cette version ajoute, **sans toucher à la page d'accueil** (elle est identique pixel pour pixel) :

- un **modèle de page d'article** réutilisable (une page par article, adresse `/<slug>`) ;
- la **recherche fonctionnelle** du champ de l'en-tête (page `/recherche`) ;
- une **couche de données** unique pour les articles et leurs **catégories** (plusieurs par article).

Le Google Sheets et les Google Docs ne sont **pas connectés** et l'automatisation de publication n'existe pas encore.

## Lancer le site

1. Remplacez votre ancien dossier `info-vae` par celui de l'archive (décompressée).
2. Ouvrez un terminal **dans le dossier `info-vae`**, puis : `npm install` (aucune nouvelle dépendance).
3. `npm run dev`, puis ouvrez <http://localhost:4321>. Arrêt : `Ctrl + C`.

Autres commandes : `npm run build` (crée `dist/`), `npm test` (15 contrôles automatiques : données, catégories, recherche).

## Les articles et les catégories (le point central)

**Tout vient d'un seul fichier : `src/data/articles.js`.** Les cartes de l'accueil, la page d'article,
le sommaire, les articles liés, l'index et les résultats de recherche lisent tous ce fichier : les catégories
ne peuvent donc pas différer d'un endroit à l'autre.

- `categories` est une **liste** : un article peut en avoir plusieurs, écrites **exactement** comme dans la source.
- Rien n'est créé, déduit, corrigé ou remplacé automatiquement. La 1re catégorie sert au fil d'Ariane.
- Les champs de chaque article (slug, title, cardTitle, categories, excerpt, summary, updatedAt, author, image, related, content)
  sont décrits en commentaire en tête du fichier : ce sont eux que la future automatisation devra remplir depuis le Google Sheets
  « Suivi article site info VAE » (champs encore à confirmer avec les vraies colonnes).
- Le contenu est une suite de **blocs** (`p`, `h2`, `h3`, `ul`, `hr`, `conclusion`) : format provisoire en attendant la conversion des Google Docs.
  Les `h2` alimentent automatiquement le « Plan article ».

**Ajouter un article** : ajouter un objet dans `articles.js` (adresse unique, jamais `recherche`), lancer `npm test`.
La page `/<slug>`, la recherche et les articles liés se mettent à jour d'eux-mêmes. Pour l'afficher sur l'accueil,
ajouter son slug dans `src/data/featuredArticles.js`.

**Données provisoires** : l'article « Combien coûte une VAE ? » reprend le texte de la capture de référence.
Les deux autres (`provisional: true`) ont un **texte d'attente** « [Contenu provisoire] » : à remplacer.
Leurs adresses (`/qui-peut-faire-une-vae`, `/aides-financieres-vae`) sont **provisoires** ; celle de `/combien-coute-la-vae` est connue.

## La recherche

- Le champ de l'en-tête (Entrée ou loupe) ouvre `/recherche?q=...` ; la page a aussi son propre champ.
- Elle cherche **tous les mots saisis** dans le titre, les catégories, le résumé et le contenu ; accents et majuscules ignorés ;
  un début de mot suffit (« financ »). L'ordre : titre, puis catégories, puis résumé, puis contenu.
- Si le mot n'est que dans le texte, un **extrait** est affiché. Aucun résultat : un message avec des suggestions.
- Aucun service externe : l'index `/search-index.json` est généré à la construction du site, la recherche tourne dans le navigateur
  (`src/lib/search.js`, `src/scripts/search-page.js`). Le texte saisi n'est jamais injecté comme HTML.

## Organisation des fichiers (nouveautés de cette étape)

```
src/
  data/articles.js               SOURCE UNIQUE des articles et catégories (provisoire)
  data/featuredArticles.js       Cartes de l'accueil, construites depuis articles.js
  lib/text.js                    Utilitaires (échappement, gras, ancres, dates)
  lib/search.js                  Moteur de recherche (testé)
  scripts/search-page.js         Affichage des résultats dans le navigateur
  pages/[slug].astro             Modèle de page d'article (une page par article)
  pages/recherche.astro          Page de résultats
  pages/search-index.json.js     Index de recherche généré au build
  components/                    Breadcrumb, ArticleSummary, ArticleContent, ArticleToc,
                                 CategoryList (catégories, partagé), RelatedArticles
  styles/                        un fichier CSS par composant (+ article-page.css, search-page.css)
tests/                           data.test.mjs, search.test.mjs (lancés par `npm test`)
```

Étapes précédentes (en-tête, nav, héro, accueil, carte conseillers sticky, formulaire, pied de page) : inchangées.
Les images restent **provisoires** (`public/images/`, voir ci-dessous).

## Remplacer les images provisoires

Toutes les images sont dans `public/images/` (illustrations générées, pas des photos). Mettez votre fichier avec **le même nom**,
ou changez `image` dans `articles.js` (712 × 384 px conseillé ; recadrage automatique).
`article-eligibilite-diplomes.jpg`, `article-aides-financieres.jpg`, `article-cout-vae.jpg`, `article-default.jpg`, `session-vignette.svg`.

## La carte conseillers « sticky » (accueil)

Inchangée : `HowItWorks.astro` / `how-it-works.css` (`position: sticky`, `top: var(--sticky-offset)`). Ne jamais mettre `overflow`
(hidden, auto, scroll) sur `html`, `body`, `main` ou les conteneurs de cette section. Sur la page d'article, la carte conseillers
de la colonne latérale n'est **pas** sticky (décision à confirmer).

## Ce qui a été vérifié (vrai Astro 5.18, vrai Chromium)

- `npm install` et `npm run build` : OK, 5 pages générées sans erreur ni avertissement.
- `npm test` : 15 contrôles OK (champs obligatoires, adresses uniques et propres, catégories sans doublon, cartes d'accueil = catégories des articles,
  sommaire, recherche par titre / catégorie / résumé / contenu, accents, début de mot, plusieurs mots, aucun résultat).
- Navigateur : les 3 cartes (2 boutons chacune) ouvrent la bonne page ; la nav « Combien coûte la VAE? » aussi ; fil d'Ariane, sommaire (3 ancres),
  « Lire l'article complet », articles liés ; recherche par Entrée et par loupe ; catégories identiques sur la carte, la page, le résumé et le résultat ;
  aucun résultat, requête vide, requête contenant du HTML ; aucune erreur dans la console.
- Accueil : captures identiques pixel pour pixel avant/après à 1366, 768 et 390 px ; carte sticky toujours collée à 24 px.
- Aucun débordement horizontal de 1920 à 360 px (accueil, article, recherche).
- Page d'article à 1366 px : positions et largeurs de la référence (résumé 896 px, article 725 px, colonne latérale 363 px, carte conseillers 363 × 190 px).

## Ce qui n'a PAS été vérifié

- **La police** : le site utilise la police système (Segoe UI sur Windows comme la référence). Mon environnement n'a pas Segoe UI :
  les retours à la ligne, donc les **hauteurs** (page de ~4150 px ici contre 3880 px sur la référence), peuvent différer chez vous.
- **`npm run dev` sur votre machine** (le build et le rendu ont été testés ici sur le site construit).
- Survol, clic au clavier, lecteurs d'écran : non testés ; effets de survol choisis par défaut.
- Les icônes de catégorie (étiquette, document) sont redessinées d'après la capture.

## Incohérences de la référence (non tranchées, rien n'a été inventé)

- **Catégories** : la page de référence montre « Tarifs, Coûts » (en-tête de l'article) et « Coûts, Budget, Financement » (résumé), alors que la
  carte d'accueil de cet article dit « Coûts, Budget ». Ici, une seule liste par article, reprise de la carte : `['Coûts', 'Budget']`.
- **Fil d'Ariane** : la référence affiche « Tarifs » ; ici c'est la 1re catégorie (« Coûts »), puisque « Tarifs » n'est pas dans les catégories de l'article.
- **Titres** : le titre de la page (« Tarif accompagnement… ») diffère de celui de la carte (« Combien coûte une VAE ? ») : les deux sont conservés.
- **Articles liés** : la référence montre 3 cartes qui sont en réalité des sections de l'article ; ici, on affiche les autres articles existants (2).

## À connecter plus tard

Formulaire d'inscription (n'envoie rien), Google Sheets / Google Docs, bouton menu orange, « Ressources », « Contact », autres liens de nav (`#`).
