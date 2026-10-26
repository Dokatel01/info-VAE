// Accès Google (Sheets + Drive) par COMPTE DE SERVICE, sans aucune dépendance npm.
// Les identifiants viennent uniquement de la variable d'environnement GOOGLE_SERVICE_ACCOUNT_JSON
// (secret GitHub) : rien n'est écrit dans le code ni dans les journaux.
import crypto from 'node:crypto';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'].join(' ');
const b64url = (input) => Buffer.from(input).toString('base64url');

export class GoogleError extends Error {
  constructor(message, status) { super(message); this.name = 'GoogleError'; this.status = status; }
}

export function parseCredentials(raw) {
  let c;
  try { c = JSON.parse(raw); } catch { throw new GoogleError('GOOGLE_SERVICE_ACCOUNT_JSON n’est pas un JSON valide.'); }
  if (!c.client_email || !c.private_key) throw new GoogleError('GOOGLE_SERVICE_ACCOUNT_JSON : client_email ou private_key manquant.');
  return c;
}

export function createGoogleClient({ credentials, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), nowMs = () => Date.now() }) {
  let token = null;
  let tokenExp = 0;

  async function accessToken() {
    if (token && nowMs() < tokenExp - 60_000) return token;
    const iat = Math.floor(nowMs() / 1000);
    const claims = { iss: credentials.client_email, scope: SCOPES, aud: credentials.token_uri || 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 };
    const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
    const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key).toString('base64url');
    const res = await fetchImpl(claims.aud, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    });
    if (!res.ok) throw new GoogleError(`Authentification Google refusée (HTTP ${res.status}).`, res.status);
    const data = await res.json();
    token = data.access_token;
    tokenExp = nowMs() + (data.expires_in ?? 3600) * 1000;
    return token;
  }

  /** Appel HTTP avec 3 tentatives pour les erreurs temporaires (429, 5xx). */
  async function call(url, init = {}, { text = false } = {}) {
    let last;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetchImpl(url, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${await accessToken()}` } });
      if (res.ok) return text ? res.text() : res.json();
      last = new GoogleError(`Google a répondu HTTP ${res.status}`, res.status);
      if (res.status !== 429 && res.status < 500) break;
      await sleep(1000 * attempt);
    }
    throw last;
  }

  const enc = encodeURIComponent;

  return {
    /** Lit tout l'onglet : pour chaque ligne, le texte affiché et le lien éventuel de chaque cellule. */
    async readSheet(spreadsheetId, tab) {
      const range = enc(`${tab}!A1:Z2000`);
      const fields = enc('sheets(properties(title),data(rowData(values(formattedValue,hyperlink,userEnteredValue,textFormatRuns))))');
      const data = await call(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&ranges=${range}&fields=${fields}`);
      const rowData = data.sheets?.[0]?.data?.[0]?.rowData ?? [];
      return rowData.map((r, i) => ({
        row: i + 1,
        cells: (r.values ?? []).map((c) => ({ text: c.formattedValue ?? '', link: extractLink(c) })),
      }));
    },
    async getValues(spreadsheetId, range) {
      const data = await call(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${enc(range)}`);
      return data.values ?? [];
    },
    async setValues(spreadsheetId, range, values) {
      return call(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${enc(range)}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
      });
    },
    /** Export d'un Google Doc en Markdown (lecture seule : le Doc n'est jamais modifié). */
    async exportDocMarkdown(docId) {
      return call(`https://www.googleapis.com/drive/v3/files/${enc(docId)}/export?mimeType=${enc('text/markdown')}&supportsAllDrives=true`, {}, { text: true });
    },
  };
}

export function extractLink(cell) {
  if (cell.hyperlink) return cell.hyperlink;
  const run = cell.textFormatRuns?.find((r) => r.format?.link?.uri);
  if (run) return run.format.link.uri;
  const formula = cell.userEnteredValue?.formulaValue;
  const m = formula && /HYPERLINK\(\s*"([^"]+)"/i.exec(formula);
  if (m) return m[1];
  if (/^https?:\/\//.test(cell.formattedValue ?? '')) return cell.formattedValue;
  return null;
}

export function docIdFromUrl(url) {
  const m = /\/d\/([A-Za-z0-9_-]{20,})/.exec(url ?? '') || /[?&]id=([A-Za-z0-9_-]{20,})/.exec(url ?? '');
  return m ? m[1] : null;
}
