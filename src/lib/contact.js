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
