# Info VAE : site Astro (étape 1 : en-tête, navigation, héro)

Cette version contient uniquement l'**en-tête**, la **barre de navigation** et la **section héro**.
Les autres sections viendront après votre validation.

## Lancer le projet sur votre ordinateur

1. **Installer Node.js** (une seule fois) : téléchargez la version « LTS » sur <https://nodejs.org>
   (version 20 ou 22 recommandée), puis installez-la avec les options par défaut.
2. **Décompresser l'archive** `info-vae.zip` (clic droit → « Extraire tout… » sous Windows).
3. **Ouvrir un terminal dans le dossier `info-vae`** :
   sous Windows, clic droit dans le dossier → « Ouvrir dans le Terminal ».
4. **Installer les dépendances** (une seule fois, nécessite Internet) :
   ```
   npm install
   ```
5. **Lancer le site en local** :
   ```
   npm run dev
   ```
6. **Ouvrir** <http://localhost:4321> dans votre navigateur.
   Chaque modification d'un fichier met la page à jour automatiquement.
7. **Arrêter** le serveur : `Ctrl + C` dans le terminal.

Pour vérifier que le site se construit correctement : `npm run build` (crée un dossier `dist/`).

## Comment comparer avec la référence

Ouvrez la page à 1366 px de large (outils de développement du navigateur : `F12`, puis
l'icône « appareil » pour fixer la largeur) et placez-la à côté de la capture de référence.

## Organisation des fichiers

```
src/
  layouts/BaseLayout.astro   Gabarit commun (en-tête + nav + contenu)
  components/
    Header.astro             En-tête : menu, logo, recherche, Ressources, Contact
    NavBar.astro             Barre de navigation verte
    Hero.astro               Section héro (dégradé, titre, texte, 2 boutons)
  pages/index.astro          Page d'accueil
  styles/
    variables.css            TOUTES les couleurs, polices et tailles clés
    base.css  buttons.css  header.css  nav.css  hero.css
public/
  favicon.svg                Icône d'onglet PROVISOIRE
  images/                    Dossier des images (vide pour cette étape)
```

- **Changer une couleur** : `src/styles/variables.css`.
- **Changer un texte ou un lien** : le fichier du composant concerné (`Hero.astro`, `NavBar.astro`, `Header.astro`).
- **Carte conseillers sticky** : les variables `--header-height`, `--nav-height` et `--sticky-offset`
  sont déjà prêtes dans `variables.css`. Aucun `overflow` n'est posé sur `html`, `body` ou `main`
  (ce qui bloquerait le sticky).

## Ce qui a été vérifié (dans l'environnement de développement de Claude)

- Les fichiers du projet ont été assemblés en une page HTML statique par un script de contrôle,
  puis capturés dans Chromium à 1366 px et comparés à la capture de référence.
- **Dimensions identiques à la référence** : en-tête 77 px, barre de nav 44 px, héro 272 px, champ de
  recherche (x=521, 448 × 40 px), bouton menu 48 × 48 px, boutons du héro à 40 px de haut.
- **Couleurs et dégradé** : identiques à la référence (écart de 1 niveau au maximum sur le dégradé).
- **Responsive** : aucun débordement horizontal entre 1366 px et 360 px.

## Ce qui n'a PAS été vérifié (à tester de votre côté)

- **`npm install`, `npm run dev` et `npm run build` n'ont pas pu être exécutés** : l'accès au registre npm
  est bloqué dans l'environnement de développement. La syntaxe Astro utilisée est volontairement
  très simple, mais si une erreur s'affiche dans votre terminal, copiez-la-moi.
- **Version d'Astro** : `package.json` demande `^5.0.0`. Je n'ai pas pu vérifier la version
  la plus récente disponible.
- **La police** : le site utilise la police système (Segoe UI sur Windows), comme la référence.
  Mon contrôle a utilisé une police de remplacement : les largeurs de texte ont pu différer de
  quelques pixels, ce que vous verrez réellement chez vous est le bon rendu. Sur Mac, la police
  système (San Francisco) diffère de la référence : c'est normal.
- **Icônes** : dessinées dans le style de la référence (traits fins arrondis) ; l'icône téléphone
  est très proche mais pas forcément identique.
- **Survol, clic, clavier** : non visibles sur une capture, donc non reproduits à l'identique
  (soulignement au survol des liens de nav = choix provisoire de ma part).

## Éléments provisoires ou à définir

- Le bouton menu (orange), « Ressources » et « Contact » ne font rien pour l'instant.
- La recherche est un champ d'affichage (pas encore fonctionnelle).
- Liens : seul `/combien-coute-la-vae` est connu (nom de la capture) ; les autres pointent vers `#`.
- Titre de l'onglet du navigateur : provisoire.
- Favicon : provisoire.
