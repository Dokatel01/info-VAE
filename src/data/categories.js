// CATÉGORIES OFFICIELLES DU SITE
//
// Source de vérité : la colonne « Catégorie » du Google Sheets « Suivi article site info VAE »
// (liste déroulante de la colonne B). Les libellés sont recopiés EXACTEMENT, avec leurs
// majuscules, accents et absences d'accents (« Etapes VAE », « Educateur spécialisé »).
// Ne pas les corriger ni les renommer sans l'accord du propriétaire du site.
//
// Dans le Sheet, un article peut avoir plusieurs catégories, séparées par une virgule
// (« Pour qui, Auxiliaire Puériculture ») : on les représente ici par une liste.

export const officialCategories = [
  'Tarif',
  'Pour qui',
  'Financement',
  'Etapes VAE',
  'Auxiliaire Puériculture',
  'Aide soignant',
  'VAE général',
  'Educateur spécialisé',
];

/** « Pour qui, Auxiliaire Puériculture » → ['Pour qui', 'Auxiliaire Puériculture'] (texte inchangé). */
export function parseSheetCategories(cell) {
  return String(cell ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
