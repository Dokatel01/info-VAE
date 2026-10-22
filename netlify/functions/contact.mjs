// Fonction serveur Netlify : reçoit le formulaire de contact et l'écrit dans le Google Sheets « Info VAE – Contacts ».
// Adresse publique : POST /api/contact
//
// Chemin des données :  navigateur → cette fonction → Google Apps Script (lié au Sheet) → nouvelle ligne.
// Les secrets restent ICI, côté serveur, dans les variables d'environnement Netlify :
//   APPS_SCRIPT_URL      adresse du déploiement « Application Web » de apps-script/Code.gs
//   APPS_SCRIPT_SECRET   mot de passe partagé avec le script (le même que la propriété SECRET du script)
//   ALLOWED_ORIGINS      (facultatif) sites autorisés, ex. « info-vae.netlify.app,www.info-vae.fr »
// Rien de tout cela n'est écrit dans le code ni envoyé au navigateur.
import { validateContact, cleanUtm, createRateLimiter, isAllowedOrigin, MIN_FILL_MS } from '../../src/lib/contact.js';

export const config = { path: '/api/contact' };

const allow = createRateLimiter();

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function handle(req, env = process.env, fetchImpl = fetch, rateLimiter = allow) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' });

  // 1. Sécurité : requête venant du site lui-même, au format JSON.
  const allowed = env.ALLOWED_ORIGINS || 'info-vae.netlify.app,localhost:8888,localhost:4321';
  if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'), allowed)) return json(403, { ok: false, error: 'origin' });
  if (!(req.headers.get('content-type') || '').includes('application/json')) return json(415, { ok: false, error: 'type' });

  // 2. Limitation de débit (par adresse IP, au mieux).
  const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'inconnue').split(',')[0].trim();
  if (!rateLimiter(ip)) return json(429, { ok: false, error: 'rate' });

  // 3. Lecture et validation côté serveur (le contrôle du navigateur n'est qu'un confort).
  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'json' }); }
  if (typeof body?.elapsed !== 'number' || body.elapsed < MIN_FILL_MS) return json(400, { ok: false, error: 'trop-rapide' });
  const result = validateContact(body);
  if (!result.ok) return json(422, { ok: false, error: 'validation', fields: result.errors });

  // 4. Configuration serveur indispensable.
  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) return json(500, { ok: false, error: 'config' });

  // 5. Écriture dans le Sheet : on ne répond « ok » que si le script confirme.
  try {
    const res = await fetchImpl(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      // Les 5 paramètres UTM sont facultatifs : absents → chaînes vides, jamais d'erreur.
      body: JSON.stringify({ secret: env.APPS_SCRIPT_SECRET, ...result.values, ...cleanUtm(body.utm) }),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.ok !== true) return json(502, { ok: false, error: 'enregistrement' });
  } catch {
    return json(502, { ok: false, error: 'enregistrement' });
  }
  return json(200, { ok: true });
}

export default (req) => handle(req);
