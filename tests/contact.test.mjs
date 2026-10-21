// Contrôle du formulaire de contact (validation, sécurité de la fonction serveur) : `npm test`.
// La fonction est testée avec un FAUX Google Apps Script : aucune donnée réelle n'est envoyée.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateContact, createRateLimiter, isAllowedOrigin } from '../src/lib/contact.js';
import { handle } from '../netlify/functions/contact.mjs';

const ENV = { APPS_SCRIPT_URL: 'https://script.example/exec', APPS_SCRIPT_SECRET: 's3cret-test', ALLOWED_ORIGINS: 'info-vae.netlify.app' };
const GOOD = { firstname: 'Marie', lastname: 'Dupont', email: 'Marie.Dupont@Example.fr', elapsed: 6000 };
const request = (body, headers = {}) =>
  new Request('https://info-vae.netlify.app/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://info-vae.netlify.app', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const okSink = () => { const calls = []; return { calls, fn: async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ ok: true }), { status: 200 }); } }; };
const fresh = () => createRateLimiter();

test('validation : trois champs obligatoires, e-mail au bon format, texte nettoyé', () => {
  const ok = validateContact({ firstname: '  Marie  ', lastname: 'Dupont', email: ' Marie@Example.FR ' });
  assert.deepEqual(ok, { ok: true, values: { firstname: 'Marie', lastname: 'Dupont', email: 'marie@example.fr' } });
  assert.deepEqual(Object.keys(validateContact({}).errors).sort(), ['email', 'firstname', 'lastname']);
  for (const bad of ['abc', 'a@b', 'a b@c.fr', '@c.fr', 'a@@c.fr', 'a@c.f', '<x>@c.fr']) {
    assert.ok(validateContact({ firstname: 'A', lastname: 'B', email: bad }).errors?.email, `e-mail accepté à tort : ${bad}`);
  }
  assert.ok(validateContact({ firstname: 'A\u0000B', lastname: 'B', email: 'a@b.fr' }).errors.firstname);
  assert.ok(validateContact({ firstname: 'x'.repeat(81), lastname: 'B', email: 'a@b.fr' }).errors.firstname);
  assert.ok(validateContact({ firstname: 123, lastname: 'B', email: 'a@b.fr' }).errors.firstname);
});

test('envoi valide : réponse 200, UNE écriture, secret transmis au script seulement', async () => {
  const sink = okSink();
  const res = await handle(request(GOOD), ENV, sink.fn, fresh());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(sink.calls.length, 1);
  const sent = JSON.parse(sink.calls[0].init.body);
  assert.deepEqual(sent, { secret: 's3cret-test', firstname: 'Marie', lastname: 'Dupont', email: 'marie.dupont@example.fr' });
  assert.deepEqual(Object.keys(sent).sort(), ['email', 'firstname', 'lastname', 'secret']); // aucun autre champ
});

test('données invalides : 422, rien n’est écrit', async () => {
  const sink = okSink();
  const res = await handle(request({ ...GOOD, email: 'pas-un-email' }), ENV, sink.fn, fresh());
  assert.equal(res.status, 422);
  assert.ok((await res.json()).fields.email);
  assert.equal(sink.calls.length, 0);
});

test('échec de l’enregistrement : jamais de « ok » (502), que le script refuse, plante ou soit injoignable', async () => {
  const cases = [
    async () => new Response(JSON.stringify({ ok: false }), { status: 200 }),
    async () => new Response('<html>erreur</html>', { status: 200 }),
    async () => new Response('', { status: 500 }),
    async () => { throw new Error('réseau'); },
  ];
  for (const fn of cases) {
    const res = await handle(request(GOOD), ENV, fn, fresh());
    assert.equal(res.status, 502);
    assert.equal((await res.json()).ok, false);
  }
});

test('configuration absente : 500 sans appel externe', async () => {
  const sink = okSink();
  const res = await handle(request(GOOD), { ALLOWED_ORIGINS: ENV.ALLOWED_ORIGINS }, sink.fn, fresh());
  assert.equal(res.status, 500);
  assert.equal(sink.calls.length, 0);
});

test('anti-spam : origine étrangère, mauvais format, envoi trop rapide, trop de requêtes', async () => {
  const sink = okSink();
  assert.equal((await handle(request(GOOD, { origin: 'https://evil.example' }), ENV, sink.fn, fresh())).status, 403);
  assert.equal((await handle(new Request('https://info-vae.netlify.app/api/contact', { method: 'POST', body: 'a=b' }), ENV, sink.fn, fresh())).status, 403); // sans origine
  assert.equal((await handle(request(GOOD, { 'content-type': 'application/x-www-form-urlencoded' }), ENV, sink.fn, fresh())).status, 415);
  assert.equal((await handle(request('{pas du json'), ENV, sink.fn, fresh())).status, 400);
  assert.equal((await handle(request({ ...GOOD, elapsed: 200 }), ENV, sink.fn, fresh())).status, 400);
  assert.equal((await handle(request({ firstname: 'A', lastname: 'B', email: 'a@b.fr' }), ENV, sink.fn, fresh())).status, 400); // sans délai
  assert.equal((await handle(new Request('https://info-vae.netlify.app/api/contact'), ENV, sink.fn, fresh())).status, 405);
  assert.equal(sink.calls.length, 0);
  const limiter = createRateLimiter({ max: 2 });
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await handle(request(GOOD), ENV, sink.fn, limiter)).status);
  assert.deepEqual(statuses, [200, 200, 429]);
});

test('limiteur : la fenêtre se libère avec le temps ; origine : hôte exact seulement', () => {
  let t = 0;
  const allow = createRateLimiter({ max: 1, windowMs: 1000, now: () => t });
  assert.equal(allow('ip'), true);
  assert.equal(allow('ip'), false);
  t = 1500;
  assert.equal(allow('ip'), true);
  assert.equal(isAllowedOrigin('https://info-vae.netlify.app', '', 'info-vae.netlify.app'), true);
  assert.equal(isAllowedOrigin('https://info-vae.netlify.app.evil.com', '', 'info-vae.netlify.app'), false);
  assert.equal(isAllowedOrigin('', 'https://info-vae.netlify.app/page', 'https://info-vae.netlify.app'), true);
});

test('aucun secret dans le dépôt : pas de clé, URL de script ni mot de passe écrits dans le code', () => {
  const files = ['netlify/functions/contact.mjs', 'src/lib/contact.js', 'src/components/InfoSession.astro', 'apps-script/Code.gs'];
  for (const f of files) {
    const text = fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.ok(!/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}/.test(text), `${f} : adresse du script écrite en dur`);
    assert.ok(!/AKfycb[A-Za-z0-9_-]{20,}/.test(text), `${f} : identifiant de déploiement écrit en dur`);
    assert.ok(!/BEGIN (RSA )?PRIVATE KEY|"private_key"/.test(text), `${f} : clé privée`);
  }
  const front = fs.readFileSync(new URL('../src/components/InfoSession.astro', import.meta.url), 'utf8');
  assert.ok(!/APPS_SCRIPT|SECRET/.test(front), 'le navigateur ne doit connaître aucun secret');
  assert.ok(/fetch\('\/api\/contact'/.test(front));
});

test('formulaire : exactement trois champs (prénom, nom, e-mail)', () => {
  const html = fs.readFileSync(new URL('../src/components/InfoSession.astro', import.meta.url), 'utf8');
  const form = html.match(/<form[\s\S]*?<\/form>/)[0];
  const fields = [...form.matchAll(/<(input|select|textarea)\b[^>]*name="([^"]+)"/g)].map((m) => m[2]);
  assert.deepEqual(fields, ['firstname', 'lastname', 'email']);
});
