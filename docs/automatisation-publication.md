# Publication quotidienne automatique des articles

Du lundi au vendredi à **8 h 00 (heure de Paris)**, GitHub Actions lance `scripts/publish/run.mjs`, même ordinateur éteint.

## Ce que fait le robot, dans l'ordre
1. Lit le Google Sheets « Suivi article site info VAE » (onglet « Feuille 1 », colonnes repérées par leur **nom** : Titre, Catégorie, État, Date de publication, Fichier).
2. Retient les lignes dont l'état est exactement **« à intégrer »** (jamais « En cours d'examen », ni « Publié »). Aucune ligne → il s'arrête sans rien modifier.
3. Pour chacune : lit le Google Doc en **lecture seule** (jamais modifié), vérifie le titre, le lien, les catégories (uniquement les 8 catégories officielles, aucune n'est créée), l'adresse (`/<titre-sans-accents>`) et le contenu (40 mots minimum).
4. Crée l'article (même structure que les articles déjà publiés), son illustration, ses expressions de maillage (le titre) et un texte alternatif provisoire. Les liens contextuels et « Articles liés » se calculent à l'affichage.
5. Lance les **contrôles** (`npm test`, contrôle des illustrations, `npm run build`). Si l'un échoue : rien n'est enregistré, l'article reste « à intégrer » et l'erreur est affichée.
6. Enregistre dans GitHub (`main`) → **Netlify redéploie tout seul** (aucun jeton Netlify nécessaire).
7. Attend jusqu'à 20 min que la page soit **en ligne** avec son titre.
8. **Seulement alors** : relit la ligne du Sheet (inchangée ?) et écrit « Publié » + la date du jour (jj/mm/aaaa), puis relit pour confirmer.

Erreurs : une erreur sur un article n'arrête pas les autres. Le passage est marqué « échec » dans GitHub (vous recevez le courriel d'alerte habituel de GitHub) et le détail est dans le résumé du passage.

Doublons : chaque article est reconnu par l'identifiant de son Doc. Si un passage s'interrompt après l'envoi vers GitHub, le passage suivant ne recrée rien : il vérifie que la page est en ligne puis marque le Sheet. Un passage ne démarre jamais en même temps qu'un autre.

## Heure d'été / heure d'hiver
GitHub raconte l'heure en UTC. Deux déclenchements sont programmés (6 h et 7 h UTC) ; une étape « Garde horaire » ne laisse passer que celui qui tombe à 8 h à Paris (7 h UTC en hiver, 6 h UTC en été). Aucune intervention aux changements d'heure.
Limite connue : GitHub peut retarder un déclenchement de quelques minutes (parfois davantage aux heures chargées).

## À configurer une seule fois (le robot ne peut pas le faire à votre place)
**1. Compte de service Google** (console.cloud.google.com)
   - Créer (ou choisir) un projet ; activer **Google Sheets API** et **Google Drive API**.
   - IAM et administration → Comptes de service → Créer. Puis onglet Clés → Ajouter une clé → JSON : un fichier est téléchargé. Notez l'adresse du compte (`…@….iam.gserviceaccount.com`).

**2. Partager avec ce compte** (comme avec une personne, via « Partager »)
   - le Google Sheets « Suivi article site info VAE » : **Éditeur** ;
   - les Google Docs des articles (ou leur dossier) : **Lecteur**. Les Docs des lignes 22 à 66, aujourd'hui introuvables, devront aussi lui être partagés pour pouvoir être publiés.

**3. Secret GitHub** : dépôt `Dokatel01/info-VAE` → Settings → Secrets and variables → Actions → *New repository secret* :
   nom `GOOGLE_SERVICE_ACCOUNT_JSON`, valeur = **tout le contenu** du fichier JSON. Ne le collez jamais ailleurs (ni chat, ni code), puis supprimez le fichier téléchargé.
   (Facultatif, onglet *Variables* : `SHEET_ID`, `SHEET_TAB`, `SITE_URL` ; sinon les valeurs actuelles sont utilisées.)

**4. Vérifier** Settings → Actions → General : Actions autorisées, et « Workflow permissions » = *Read and write*.

## Tests à lancer ensuite (Actions → « Publication quotidienne des articles » → Run workflow)
1. **test-lecture-docs** : relit 5 Docs déjà publiés et les compare au site (prouve l'accès Google et la conversion).
2. **simulation** : lit le Sheet et les Docs « à intégrer », annonce ce qui serait publié, ne modifie rien.
3. **publication** : à faire avec une vraie ligne passée à « à intégrer ».

## Ce que le robot ne fait pas
- Il ne crée pas de **photos** : il utilise l'illustration générée. Ajoutez ensuite la photo (voir `docs/photos-brief.md`) et remplacez le texte alternatif provisoire (`« Sur le thème : … »`) par une description de la photo dans `src/data/imageAlt.js`.
- Il ne réécrit pas les textes et ne crée pas de catégorie : une catégorie inconnue = erreur signalée.
- GitHub désactive les déclenchements programmés d'un dépôt **public** sans aucune activité depuis 60 jours ; en cas de message GitHub en ce sens, réactivez le workflow dans l'onglet Actions.
