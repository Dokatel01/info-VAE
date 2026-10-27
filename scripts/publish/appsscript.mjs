// Client de la passerelle Google Apps Script (apps-script/publication/Code.gs).
// Même interface que le client « compte de service » (google.mjs), pour que le reste du robot ne change pas.
// Chaque requête est signée en HMAC-SHA256 : le secret ne part jamais sur le réseau et n'est jamais affiché.
import crypto from 'node:crypto';

export class AppsScriptError extends Error {
  constructor(message) { super(message); this.name = 'AppsScriptError'; }
}

/** L'adresse doit être un déploiement Apps Script (https://script.google.com/macros/s/<id>/exec). */
export function validateScriptUrl(url) {
  let u;
  try { u = new URL(url); } catch { throw new AppsScriptError('APPS_SCRIPT_URL n’est pas une adresse valide.'); }
  if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)) {
    throw new AppsScriptError('APPS_SCRIPT_URL doit ressembler à https://script.google.com/macros/s/…/exec');
  }
  return u.href;
}

export function createAppsScriptClient({ url, secret, fetchImpl = fetch, nowMs = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const endpoint = validateScriptUrl(url);
  if (!secret || secret.length < 32) throw new AppsScriptError('APPS_SCRIPT_SECRET manquant ou trop court (32 caractères minimum).');

  async function call(action, params = {}) {
    let last;
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Nouveau nonce à chaque tentative : une requête n'est acceptée qu'une seule fois par le script.
      const payload = JSON.stringify({ action, params, ts: Math.floor(nowMs() / 1000), nonce: crypto.randomBytes(18).toString('base64url') });
      const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      let res;
      try {
        res = await fetchImpl(endpoint, { method: 'POST', redirect: 'follow', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ payload, sig }) });
      } catch (e) { last = new AppsScriptError(`passerelle injoignable (${e.message})`); await sleep(1000 * attempt); continue; }
      if (res.status === 401 || res.status === 403) throw new AppsScriptError(`passerelle : HTTP ${res.status} — le déploiement Apps Script n'est pas public : Déployer → Gérer les déploiements → ✏ → « Qui a accès » = « Tout le monde » (pas « Tout le monde disposant d'un compte Google »), puis Nouvelle version`);
      if (res.status === 404) throw new AppsScriptError('passerelle : HTTP 404 — adresse de déploiement introuvable (APPS_SCRIPT_URL erronée ou déploiement supprimé)');
      if (!res.ok) { last = new AppsScriptError(`passerelle : HTTP ${res.status}`); if (res.status < 500 && res.status !== 429) break; await sleep(1000 * attempt); continue; }
      let body;
      try { body = await res.json(); } catch { throw new AppsScriptError('réponse inattendue de la passerelle (déploiement incorrect ? accès « Tout le monde » requis)'); }
      if (body.ok) return body.data;
      const detail = body.detail ? ` : ${body.detail}` : '';
      throw new AppsScriptError(`passerelle : ${body.error ?? 'erreur'}${detail}`);
    }
    throw last;
  }

  return {
    ping: () => call('ping'),
    async readSheet() { return (await call('readSheet')).rows; },
    async exportDocMarkdown(docId) { return (await call('exportDoc', { docId })).markdown; },
    /** Écrit « Publié » + date (AAAA-MM-JJ) ; le script revérifie la ligne avant d'écrire. */
    markPublished({ row, title, docId, date }) { return call('markPublished', { row, title, docId, date }); },
  };
}
