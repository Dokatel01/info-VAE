# Publication quotidienne automatique des articles

Du lundi au vendredi à **18 h 00 (heure de Paris)**, GitHub Actions lance `scripts/publish/run.mjs`, même ordinateur éteint.

## Ce que fait le robot, dans l'ordre
1. Lit le Google Sheets (par la passerelle Apps Script, ou par un compte de service si configuré) « Suivi article site info VAE » (onglet « Feuille 1 », colonnes repérées par leur **nom** : Titre, Catégorie, État, Date de publication, Fichier).
2. Retient les lignes dont l'état est exactement **« à intégrer »** (jamais « En cours d'examen », ni « Publié »). Aucune ligne → il s'arrête sans rien modifier.
3. Pour chacune : lit le Google Doc en **lecture seule** (jamais modifié), vérifie le titre, le lien, les catégories (uniquement les 8 catégories officielles, aucune n'est créée), l'adresse (`/<titre-sans-accents>`) et le contenu (40 mots minimum).
4. Crée l'article (même structure que les articles déjà publiés), son illustration, ses expressions de maillage (le titre) et un texte alternatif provisoire. Les liens contextuels et « Articles liés » se calculent à l'affichage.
5. Lance les **contrôles** (`npm test`, contrôle des illustrations, `npm run build`). Si l'un échoue : rien n'est enregistré, l'article reste « à intégrer » et l'erreur est affichée.
6. Enregistre dans GitHub (`main`) → **Vercel redéploie tout seul** (aucun jeton Vercel nécessaire ; le robot attend que la page soit réellement en ligne sur `https://info-vae.vercel.app`).
7. Attend jusqu'à 20 min que la page soit **en ligne** avec son titre.
8. **Seulement alors** : relit la ligne du Sheet (inchangée ?) et écrit « Publié » + la date du jour (jj/mm/aaaa), puis relit pour confirmer.

Erreurs : une erreur sur un article n'arrête pas les autres. Le passage est marqué « échec » dans GitHub (vous recevez le courriel d'alerte habituel de GitHub) et le détail est dans le résumé du passage.

**Phase de test : un seul article par jour ouvré.** À 18 h (Paris), le robot ne traite que le premier article « à intégrer » dans l'ordre du Sheet ; les suivants attendent les jours d'après. Si un article a déjà été publié aujourd'hui, une relance ne fait rien. Si le premier article échoue, le robot s'arrête là : la ligne reste « à intégrer », le Sheet n'est pas modifié et la cause est écrite dans le compte rendu de l'exécution (onglet Actions de GitHub).

Doublons : chaque article est reconnu par l'identifiant de son Doc. Si un passage s'interrompt après l'envoi vers GitHub, le passage suivant ne recrée rien : il vérifie que la page est en ligne puis marque le Sheet. Un passage ne démarre jamais en même temps qu'un autre.

## Heure d'été / heure d'hiver
GitHub raconte l'heure en UTC. Deux déclenchements sont programmés (16 h et 17 h UTC) ; une étape « Garde horaire » ne laisse passer que celui qui tombe à 18 h à Paris (17 h UTC en hiver, 16 h UTC en été). Aucune intervention aux changements d'heure.
Limite connue : GitHub peut retarder un déclenchement de quelques minutes (parfois davantage aux heures chargées).

## Fichier de référence officiel (décision du 27/10/2026)
La **source officielle** de l'automatisation est le Google Sheets **« Suivi article site info VAE »** situé dans **Mon Drive → Info VAE → VAE** (compte `designer@dokatel.com`), identifiant `1UBLJzkL7PZEPU9mf6C3PrB7ds-Htj-48m4Sqdsw3Qe8`.
- **Toute l'équipe doit désormais travailler dans CE fichier** (ajout de lignes, passage à « à intégrer », notes). L'ancien fichier (propriétaire `contact@dokatel.com`, « Partagés avec moi ») n'est plus lu : une ligne « à intégrer » saisie dedans ne serait jamais publiée. Il est conseillé de l'archiver ou d'y écrire « OBSOLÈTE » en tête.
- Le script Apps Script doit être **lié à ce fichier**. À chaque passage, le robot interroge le script et **s'arrête sans rien faire** si celui-ci n'est pas lié au bon fichier, ou s'il s'agit d'une ancienne version du script.
- Les Google Docs restent dans leur dossier d'origine : le compte `designer@dokatel.com` doit pouvoir les lire (l'accès par compte de service, s'il est utilisé, doit aussi être partagé avec ce nouveau fichier).

## Accès Google : deux méthodes (le robot choisit l'Apps Script s'il est configuré)
- **Apps Script (recommandé tant que Google Cloud est bloqué)** : voir `apps-script/publication/README.md` (secrets GitHub `APPS_SCRIPT_URL` et `APPS_SCRIPT_SECRET`).
- **Compte de service Google Cloud** (ci-dessous) : secret `GOOGLE_SERVICE_ACCOUNT_JSON`.

## Compte de service Google Cloud (alternative)
**1. Compte de service Google** (console.cloud.google.com)
   - Créer (ou choisir) un projet ; activer **Google Sheets API** et **Google Drive API**.
   - IAM et administration → Comptes de service → Créer. Puis onglet Clés → Ajouter une clé → JSON : un fichier est téléchargé. Notez l'adresse du compte (`…@….iam.gserviceaccount.com`).

**2. Partager avec ce compte** (comme avec une personne, via « Partager »)
   - le Google Sheets « Suivi article site info VAE » : **Éditeur** ;
   - les Google Docs des articles (ou leur dossier) : **Lecteur**. Les Docs des lignes 22 à 66, aujourd'hui introuvables, devront aussi lui être partagés pour pouvoir être publiés.

**3. Secret GitHub** : dépôt `Dokatel01/info-VAE` → Settings → Secrets and variables → Actions → *New repository secret* :
   nom `GOOGLE_SERVICE_ACCOUNT_JSON`, valeur = **tout le contenu** du fichier JSON. Ne le collez jamais ailleurs (ni chat, ni code), puis supprimez le fichier téléchargé.
   (Facultatif, onglet *Variables* : `SHEET_ID`, `SHEET_TAB`, `SITE_URL` (laisser vide : valeur par défaut `https://info-vae.vercel.app` ; une adresse Netlify est refusée) ; sinon les valeurs par défaut sont utilisées, dont le Sheet de référence ci-dessus. Ne définissez `SHEET_ID` que pour changer de fichier.)

**4. Vérifier** Settings → Actions → General : Actions autorisées, et « Workflow permissions » = *Read and write*.

## Tests à lancer ensuite (Actions → « Publication quotidienne des articles » → Run workflow)
1. **test-lecture-docs** : relit 5 Docs déjà publiés et les compare au site (prouve l'accès Google et la conversion).
2. **simulation** : lit le Sheet et les Docs « à intégrer », annonce ce qui serait publié, ne modifie rien.
3. **publication** : à faire avec une vraie ligne passée à « à intégrer ».

## Ce que le robot ne fait pas
- Il ne crée pas de **photos** : il utilise l'illustration générée. Ajoutez ensuite la photo (voir `docs/photos-brief.md`) et remplacez le texte alternatif provisoire (`« Sur le thème : … »`) par une description de la photo dans `src/data/imageAlt.js`.
- Il ne réécrit pas les textes et ne crée pas de catégorie : une catégorie inconnue = erreur signalée.
- GitHub désactive les déclenchements programmés d'un dépôt **public** sans aucune activité depuis 60 jours ; en cas de message GitHub en ce sens, réactivez le workflow dans l'onglet Actions.

<!-- Essai du 28/10/2026 : commit signé comme le robot, pour vérifier que Vercel le déploie. -->
