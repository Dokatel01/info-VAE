// ============================================================================
// MAILLAGE INTERNE : liens contextuels entre articles
//
// Pour CHAQUE article cible (identifié par son adresse /<slug>), on liste les expressions du texte
// qui doivent mener vers lui. Le programme (src/lib/internalLinks.js) cherche ces expressions dans le
// texte des autres articles et crée le lien automatiquement, avec ces règles :
//   - jamais de lien dans un titre, ni dans un passage en gras, ni vers l'article lui-même ;
//   - un seul lien par article cible et par page, sur la 1re occurrence trouvée ;
//   - 4 liens contextuels au maximum par page (pour rester naturel et ne pas surcharger) ;
//   - le texte des Google Docs n'est JAMAIS modifié : seul l'affichage reçoit un lien.
// Une expression qui n'existe dans aucun texte ne crée simplement aucun lien.
//
// Nouvel article : ajouter une ligne ci-dessous avec son adresse et 1 à 4 expressions naturelles
// (celles qu'un lecteur cliquerait pour en savoir plus). Sans ligne, l'article reste relié par la
// section « Articles liés » (calculée automatiquement, voir getRelated dans articles.js).
// ============================================================================

export const MAX_INLINE_LINKS = 4;

export const linkTargets = {
  'combien-coute-la-vae': ['combien coûte une VAE', 'coût d’une VAE', "coût d'une VAE", 'coûts d’une VAE', "coûts d'une VAE", 'coût de la VAE', 'Combien coûte', 'tarifs'],
  'qui-peut-faire-une-vae': ['Qui peut faire une VAE', 'qui peut faire une VAE', 'conditions d’éligibilité', 'êtes éligible à la VAE'],
  'quelles-sont-les-etapes-de-la-vae': ['les étapes de la VAE', 'étapes de la VAE', 'étapes de la procédure'],
  'les-etapes-de-la-vae-et-leur-duree': ['durée d’une VAE', "durée d'une VAE", 'durée totale', 'combien de temps dure une VAE', 'durée du parcours'],
  'le-passage-devant-le-jury-une-etape-obligatoire-dans-la-demarche-de-vae': ['passage devant le jury', 'passage à l\'oral devant le jury'],
  'le-passage-devant-le-jury-pour-une-vae-deroulement-et-conseils-pratiques': ['déroulement de l’entretien', "déroulement de l'entretien", 'entretien avec le jury'],
  'comment-choisir-le-bon-diplome-pour-la-vae': ['choisir le bon diplôme', 'choisir le diplôme', 'choix du diplôme'],
  'comment-rediger-son-livret-2-pour-une-vae-quelques-conseils': ['rédiger son livret 2', 'rédiger votre livret 2', 'rédaction du livret 2', 'rédiger le livret 2', 'rédaction du dossier de validation'],
  'faut-il-se-faire-accompagner-pour-sa-vae': ['se faire accompagner', 'accompagnement VAE', 'faire appel à un accompagnateur'],
  'comment-choisir-son-organisme-accompagnateur-vae': ['organisme accompagnateur', 'choisir son accompagnateur', 'accompagnateur agréé'],
  'aides-financieres-vae': ['aides financières', 'financer votre VAE', 'financer sa VAE'],
  'le-cpf-pour-financer-la-vae-ce-qu-il-faut-savoir': ['Compte Personnel de Formation', 'financement par le CPF', 'CPF'],
  'est-ce-que-pole-emploi-finance-la-vae-ce-qu-il-faut-savoir': ['Pôle emploi', 'Pôle Emploi'],
  'peut-on-faire-une-vae-a-distance': ['VAE à distance', 'à distance'],
  'comment-obtenir-le-diplome-d-etat-d-aide-soignant-deas-par-la-vae': ['aide-soignant', 'aide soignant', 'DEAS'],
  'comment-faire-une-vae-pour-devenir-educateur-specialise': ['éducateur spécialisé', 'Éducateur Spécialisé', 'DEES'],
  'obtenir-le-diplome-d-etat-d-auxiliaire-de-puericulture-par-la-vae-qui-peut-en-faire-la-demande': ['Diplôme d’État d’Auxiliaire de Puériculture', "Diplôme d'État d'Auxiliaire de Puériculture", 'auxiliaire de puériculture', 'DEAP'],
  'une-assistante-maternelle-peut-elle-devenir-auxiliaire-de-puericulture-par-la-vae': ['assistante maternelle', 'assistants maternels'],
  'le-profil-type-d-un-candidat-a-la-vae-pour-le-deap-diplome-d-etat-d-auxiliaire-de-puericulture': ['profil type', 'profils types', 'profil des candidats'],
  'la-validation-des-acquis-de-l-experience-vae-un-dispositif-cle-pour-l-evolution-professionnelle': ['dispositif clé', 'qu’est-ce que la VAE', "qu'est-ce que la VAE"],
};
