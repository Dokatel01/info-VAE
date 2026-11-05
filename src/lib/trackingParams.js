// Transmission des paramètres de suivi (UTM, identifiants de clic) d'une page à l'autre.
// Règles :
//  - seuls les liens INTERNES (même site) sont modifiés ; mailto:, tel:, ancres seules, fichiers (.svg, .json…) sont laissés tels quels ;
//  - un paramètre déjà présent dans le lien n'est JAMAIS écrasé, et aucun paramètre n'est ajouté deux fois ;
//  - les autres paramètres et l'ancre (#…) du lien sont conservés tels quels.

export const TRACKING_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform',
  'utm_creative_format', 'utm_marketing_tactic',
  'fbclid', 'gclid', 'gbraid', 'wbraid', 'dclid', 'msclkid', 'ttclid', 'twclid', 'li_fat_id', 'yclid', 'mc_cid', 'mc_eid',
];

const MAX_LENGTH = 200;

/** Paramètres de suivi non vides trouvés dans une chaîne de recherche (« ?a=b&c=d »). */
export function trackingFromSearch(search) {
  const out = {};
  let params;
  try { params = new URLSearchParams(search || ''); } catch { return out; }
  for (const key of TRACKING_KEYS) {
    const value = (params.get(key) || '').trim().slice(0, MAX_LENGTH);
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Ajoute à `href` les paramètres de suivi manquants.
 * @param {string} href       valeur de l'attribut href du lien
 * @param {Record<string,string>} tracking  paramètres à transmettre
 * @param {string} pageUrl    adresse complète de la page courante (sert de base)
 * @returns {string} le nouvel href (identique à `href` si rien n'est à ajouter)
 */
export function withTrackingParams(href, tracking, pageUrl) {
  if (!href || !tracking || !Object.keys(tracking).length) return href;
  let page, url;
  try { page = new URL(pageUrl); url = new URL(href, page); } catch { return href; }
  if (!/^https?:$/.test(url.protocol) || url.origin !== page.origin) return href;
  if (href.trim().startsWith('#')) return href; // ancre dans la même page
  const last = url.pathname.split('/').pop() || '';
  if (/\.[a-z0-9]+$/i.test(last) && !/\.html?$/i.test(last)) return href; // fichier (image, json…)
  const missing = Object.keys(tracking).filter((key) => tracking[key] && !url.searchParams.has(key));
  if (!missing.length) return href;
  const extra = missing.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(tracking[key])}`).join('&');
  // On travaille sur le texte du lien pour ne pas ré-encoder les paramètres déjà présents.
  const hashAt = href.indexOf('#');
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  const base = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const sep = base.includes('?') ? (/[?&]$/.test(base) ? '' : '&') : '?';
  return `${base}${sep}${extra}${hash}`;
}
