// Validation du formulaire de contact (3 champs : Prénom, Nom, Email).
// Utilisé par la fonction serveur (netlify/functions/contact.mjs) ET par les tests.
// La même règle est appliquée côté navigateur (src/components/InfoSession.astro) pour un retour immédiat,
// mais SEUL le contrôle côté serveur fait foi.

export const LIMITS = { name: 80, email: 254 };

// Une adresse e-mail simple : quelque chose@domaine.extension, sans espace.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
// Caractères de contrôle (retours à la ligne, tabulations…) : refusés dans les noms.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/;
const CONTROL_RE_G = /[\u0000-\u001f\u007f]/g;

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/** Renvoie { ok: true, values: { firstname, lastname, email } } ou { ok: false, errors: { champ: message } }. */
export function validateContact(input) {
  const data = input && typeof input === 'object' ? input : {};
  const values = {
    firstname: clean(data.firstname),
    lastname: clean(data.lastname),
    email: clean(data.email).toLowerCase(),
  };
  const errors = {};
  if (!values.firstname) errors.firstname = 'Le prénom est obligatoire.';
  else if (values.firstname.length > LIMITS.name || CONTROL_RE.test(values.firstname)) errors.firstname = 'Prénom invalide.';
  if (!values.lastname) errors.lastname = 'Le nom est obligatoire.';
  else if (values.lastname.length > LIMITS.name || CONTROL_RE.test(values.lastname)) errors.lastname = 'Nom invalide.';
  if (!values.email) errors.email = "L'adresse e-mail est obligatoire.";
  else if (values.email.length > LIMITS.email || !EMAIL_RE.test(values.email)) errors.email = "L'adresse e-mail n'est pas valide.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

/** Anti-spam léger : délai minimal entre l'affichage du formulaire et l'envoi (les robots envoient tout de suite). */
export const MIN_FILL_MS = 2500;

/** Limitation de débit « au mieux » (mémoire de l'instance serveur) : 5 envois / 10 min / adresse IP. */
export function createRateLimiter({ max = 5, windowMs = 10 * 60 * 1000, now = () => Date.now() } = {}) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((time) => t - time < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return false; }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((time) => t - time < windowMs)) hits.delete(k);
    return true;
  };
}

/** L'origine de la requête est-elle l'un des sites autorisés ? (liste séparée par des virgules, hôtes ou URL) */
export function isAllowedOrigin(originHeader, refererHeader, allowedList) {
  const hosts = String(allowedList ?? '').split(',').map((s) => s.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean);
  const source = originHeader || refererHeader || '';
  let host = '';
  try { host = new URL(source).host; } catch { return false; }
  return hosts.includes(host);
}

// ---------------------------------------------------------------------------
// Paramètres UTM (origine du contact). Ils ne font JAMAIS échouer un envoi :
// une valeur absente, vide, trop longue ou bizarre est simplement vidée ou raccourcie.
// ---------------------------------------------------------------------------
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
export const UTM_MAX = 200;

/** Renvoie toujours les 5 clés (chaîne vide si absente), sans caractère de contrôle, 200 caractères au maximum. */
export function cleanUtm(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {};
  for (const key of UTM_KEYS) {
    const raw = source[key];
    out[key] = typeof raw === 'string' || typeof raw === 'number'
      ? String(raw).replace(CONTROL_RE_G, ' ').replace(/\s+/g, ' ').trim().slice(0, UTM_MAX)
      : '';
  }
  return out;
}
