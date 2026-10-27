# Passerelle Apps Script de la publication automatique

Remplace l'accès « compte de service Google Cloud » (qui exige la console Google Cloud). Le robot GitHub appelle ce script, qui tourne **sous votre compte Google**, lié au Sheet « Suivi article site info VAE ».

## Ce que le script peut (et ne peut pas) faire
| Action | Effet |
|---|---|
| `ping` | répond la version du script et l'identifiant du Sheet auquel il est lié (test de déploiement) |
| `readSheet` | lit le Sheet de suivi |
| `exportDoc` | lit le texte d'un Google Doc **lié dans le Sheet** (lecture seule, aucune modification possible) |
| `markPublished` | écrit « Publié » et la date dans les colonnes État et Date d'**une** ligne, seulement si le titre et le Doc n'ont pas changé et si l'état est encore « à intégrer » |

Autorisations demandées à Google : `spreadsheets.currentonly` (ce Sheet uniquement), `drive.readonly` (lecture), `script.external_request`, `script.container.ui` (menu). Pas de suppression, pas de partage, pas d'accès aux autres fichiers en écriture.

Sécurité : chaque requête est signée (HMAC-SHA256) avec un secret que seul le script et GitHub connaissent ; elle expire en 5 minutes et ne peut servir qu'une fois. Le secret est dans les propriétés du script, pas dans le code. Aucune donnée de requête n'est écrite dans les journaux.

> **Sheet de référence :** le script doit être lié au fichier officiel « Suivi article site info VAE » de *Mon Drive → Info VAE → VAE* (identifiant `1UBLJzkL…Qe8`). Le robot vérifie cette liaison à chaque passage (action `ping`, version 1.1 ou plus) et s'arrête si elle est incorrecte.
> **Mise à jour vers la version 1.1** (ajoute le contrôle ci-dessus) : recollez `Code.gs`, enregistrez, puis *Déployer → Gérer les déploiements → ✏ → Version : Nouvelle version → Déployer*. L'URL et le jeton ne changent pas.

## Ce que vous devez faire dans votre compte Google (une seule fois, ~10 minutes)
1. Ouvrez le Sheet **« Suivi article site info VAE »** → menu **Extensions → Apps Script**.
2. Dans l'éditeur : remplacez tout le contenu de `Code.gs` par celui de `apps-script/publication/Code.gs` (dépôt GitHub). Puis ⚙ **Paramètres du projet** → cochez « Afficher le fichier manifeste appsscript.json », ouvrez-le et remplacez son contenu par celui de `apps-script/publication/appsscript.json`. Enregistrez.
3. Rechargez le Sheet : un menu **Info VAE** apparaît. Cliquez **Info VAE → Autoriser le script** et acceptez les autorisations (Google affiche « application non validée » : c'est votre propre script → *Paramètres avancés* → *Accéder à…*).
4. **Info VAE → Générer ou renouveler le jeton du robot** : une fenêtre affiche le jeton **une seule fois**. Copiez-le (ne le collez ni dans le chat, ni dans un document).
5. Dans l'éditeur : **Déployer → Nouveau déploiement → Application Web** ; *Exécuter en tant que* : **Moi** ; *Qui a accès* : **Tout le monde** (le jeton protège l'accès) → Déployer. Copiez l'**URL** (`https://script.google.com/macros/s/…/exec`).
   - Si « Tout le monde » n'est pas proposé, l'administrateur de votre domaine Google Workspace le bloque : il faut qu'il l'autorise.
6. Sur GitHub (dépôt → Settings → Secrets and variables → Actions → *New repository secret*) créez deux secrets :
   - `APPS_SCRIPT_URL` = l'URL de l'étape 5 ;
   - `APPS_SCRIPT_SECRET` = le jeton de l'étape 4.
7. Pour modifier le script plus tard sans changer l'URL : **Déployer → Gérer les déploiements → ✏ → Nouvelle version**.

## Tests à lancer ensuite
Actions → « Publication quotidienne des articles » → *Run workflow* : d'abord `test-lecture-docs`, puis `simulation`, puis `publication`.
Pour couper l'accès à tout moment : propriété de script `DISABLED` = `1`, ou générez un nouveau jeton, ou supprimez le déploiement.
