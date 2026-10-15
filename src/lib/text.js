// Petits utilitaires de texte partagés (pages d'articles, recherche, tests).

/** Échappe le HTML (les contenus d'articles ne sont jamais injectés bruts). */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Met en gras les passages écrits **comme ceci** et protège tout le reste.
 * Les retours à la ligne (\n) deviennent des <br>.
 * Le résultat est destiné à `set:html` : il est déjà échappé.
 */
export function inlineToHtml(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/** Même texte, sans la mise en forme (pour l'index de recherche). */
export function inlineToPlain(text) {
  return String(text).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n/g, ' ');
}

/** Identifiant d'ancre à partir d'un titre : « Comment financer sa VAE ? » → « comment-financer-sa-vae ». */
export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** « 2026-10-14 » → « 14/10/2026 » */
export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  return `${day}/${month}/${year}`;
}
