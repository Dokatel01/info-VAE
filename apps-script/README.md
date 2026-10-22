# Formulaire de contact → Google Sheets « Info VAE – Contacts »

Colonnes du Sheet : A Date et heure de réception · B Prénom · C Nom · D Email · E `utm_source` · F `utm_medium` · G `utm_campaign` · H `utm_term` · I `utm_content` (E à I vides si le visiteur n'arrive pas par un lien avec UTM).

Chemin des données : **navigateur → `/api/contact` (fonction Netlify) → Google Apps Script → nouvelle ligne du Sheet**.

## Installation (une seule fois, ~10 minutes)

### 1. Le script Google (dans le Sheet « Info VAE – Contacts »)
1. Ouvrir le Sheet « Info VAE – Contacts » → menu **Extensions → Apps Script**.
2. Supprimer le code par défaut, coller le contenu de `apps-script/Code.gs`, enregistrer.
3. Choisir un **mot de passe long et aléatoire** (30 caractères ou plus). Roue crantée **Paramètres du projet** → **Propriétés du script** → **Ajouter** : nom `SECRET`, valeur = ce mot de passe.
4. **Déployer → Nouveau déploiement → Application Web** : « Exécuter en tant que » **Moi** ; « Qui a accès » **Tout le monde**. Autoriser quand Google le demande.
5. Copier l'**URL de l'application Web** (finit par `/exec`). Ce n'est pas un secret en soi, mais elle ne marche qu'avec le mot de passe.

### 2. Netlify
Site → **Site configuration → Environment variables** → ajouter :
| Nom | Valeur |
|---|---|
| `APPS_SCRIPT_URL` | l'URL `/exec` copiée à l'étape 5 |
| `APPS_SCRIPT_SECRET` | le même mot de passe que la propriété `SECRET` |
| `ALLOWED_ORIGINS` | (facultatif) `info-vae.netlify.app` + votre futur domaine, séparés par des virgules |

Puis **Deploys → Trigger deploy** pour que la fonction lise ces variables.

### 3. Test
Remplir le formulaire du site : une ligne doit apparaître dans le Sheet (date, prénom, nom, e-mail).

## Origine des contacts (UTM)
- Chaque page du site mémorise les paramètres `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` présents dans l'adresse d'arrivée (mémoire de l'onglet, `sessionStorage`) ; ils sont envoyés avec le formulaire, même si le visiteur a changé de page entre-temps. Rien n'est affiché.
- Une adresse sans UTM, ou avec des UTM vides, **n'efface jamais** les valeurs déjà mémorisées. Une adresse qui porte au moins un UTM renseigné **remplace** l'ensemble (nouvelle campagne) pour ne pas mélanger deux campagnes.
- Les UTM sont facultatifs : absents, vides ou invalides, l'envoi réussit quand même (cellules vides).
- **Si vous aviez déjà installé le script avant cette mise à jour** : recoller `apps-script/Code.gs`, puis Déployer → Gérer les déploiements → crayon → Version : *Nouvelle version* → Déployer (l'URL ne change pas).

## Sécurité
- Le mot de passe et l'URL du script ne sont **jamais dans le code** : seulement dans Netlify et dans les propriétés du script.
- Le Sheet n'est partagé avec personne d'autre que son propriétaire ; pour donner accès à un collègue : bouton **Partager** du Sheet, un par un.
- Un envoi est refusé s'il ne vient pas du site, n'est pas en JSON, est instantané, est invalide, ou si une même adresse IP envoie plus de 5 fois en 10 minutes.
- Les saisies commençant par `=`, `+`, `-` ou `@` sont neutralisées pour ne pas pouvoir s'exécuter comme formule dans le tableau.
- Si le script modifie le code, il faut **redéployer** (Déployer → Gérer les déploiements → nouvelle version) : l'URL reste la même.
