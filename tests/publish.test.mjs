import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseDocMarkdown } from '../src/lib/docToBlocks.js';
import { sheetArticlesLot2 } from '../src/data/sheetArticlesLot2.js';
import { createGoogleClient, extractLink, docIdFromUrl } from '../scripts/publish/google.mjs';
import { runPublication, parseSheet, isToIntegrate, sheetSerial, columnLetter, parisDate } from '../scripts/publish/pipeline.mjs';
import { realRepo, realSite, sheetAdapter, createBackend, checkGateway, DEFAULTS, checkSiteUrl } from '../scripts/publish/run.mjs';
import { createAppsScriptClient, validateScriptUrl } from '../scripts/publish/appsscript.mjs';
import vm from 'node:vm';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const silent = () => {};

// ---------- conversion des Docs ----------
test('conversion Doc → blocs : identique aux articles déjà intégrés (fixtures du lot 2)', () => {
  let compared = 0;
  for (const a of sheetArticlesLot2) {
    const file = path.join(repoRoot, 'tests/fixtures/docs', `r${String(a.source.sheetRow).padStart(2, '0')}.md`);
    if (!fs.existsSync(file)) continue;
    const { blocks } = parseDocMarkdown(fs.readFileSync(file, 'utf8'));
    // les fins de phrases tronquées par l'export du connecteur ont été corrigées à la main : on compare le début de chaque bloc
    assert.equal(blocks.length, a.content.length, `/${a.slug} : nombre de blocs`);
    blocks.forEach((b, i) => {
      assert.equal(b.type, a.content[i].type, `/${a.slug} bloc ${i}`);
      const x = b.text ?? b.items?.join('|'), y = a.content[i].text ?? a.content[i].items?.join('|');
      assert.equal(x?.slice(0, 40), y?.slice(0, 40), `/${a.slug} bloc ${i} début`);
    });
    compared++;
  }
  assert.ok(compared >= 10, `${compared} articles comparés`);
});

test('conversion Doc → blocs : puces au format « * » et listes « 1) » acceptées, Doc vide refusé', () => {
  const md = '# Titre\n\nIntro.\n\n## Partie\n\n* un\n* deux\n\n1) a\n2) b\n\n---\n\nFin.';
  const { blocks } = parseDocMarkdown(md);
  assert.deepEqual(blocks.map((b) => b.type), ['p', 'h2', 'ul', 'ol', 'hr', 'p']);
  assert.deepEqual(blocks[2].items, ['un', 'deux']);
  assert.throws(() => parseDocMarkdown('  \n '), /vide/);
});

// ---------- Google ----------
test('Google : jeton signé RS256, lecture avec liens, nouvelle tentative sur erreur temporaire', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const credentials = { client_email: 'robot@projet.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const calls = [];
  let sheetFailures = 1;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('oauth2')) {
      const jwt = new URLSearchParams(String(init.body)).get('assertion');
      const [h, c, s] = jwt.split('.');
      assert.ok(crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url')), 'signature valide');
      const claims = JSON.parse(Buffer.from(c, 'base64url'));
      assert.equal(claims.iss, credentials.client_email);
      assert.match(claims.scope, /spreadsheets/);
      assert.doesNotMatch(claims.scope, /drive\.readonly.*drive\b(?!\.)/);
      return { ok: true, status: 200, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
    }
    assert.equal(init.headers.authorization, 'Bearer tok');
    if (String(url).includes('/spreadsheets/') && sheetFailures-- > 0) return { ok: false, status: 503 };
    if (String(url).includes('includeGridData')) {
      return { ok: true, json: async () => ({ sheets: [{ data: [{ rowData: [{ values: [{ formattedValue: 'Titre' }] }, { values: [{ formattedValue: 'A' }, { formattedValue: 'doc', hyperlink: 'https://docs.google.com/document/d/ABCDEFGHIJKLMNOPQRSTUVWX/edit' }] }] }] }] }) };
    }
    return { ok: true, text: async () => '# T\n\nTexte' , json: async () => ({}) };
  };
  const g = createGoogleClient({ credentials, fetchImpl, sleep: async () => {} });
  const rows = await g.readSheet('sheetid', 'Feuille 1');
  assert.equal(rows.length, 2);
  assert.equal(docIdFromUrl(rows[1].cells[1].link), 'ABCDEFGHIJKLMNOPQRSTUVWX');
  assert.equal(calls.filter((c) => c.url.includes('oauth2')).length, 1, 'un seul jeton pour plusieurs appels');
  assert.match(await g.exportDocMarkdown('DOCIDDOCIDDOCIDDOCIDDOCID'), /Texte/);
  assert.ok(calls.some((c) => /export\?mimeType=text%2Fmarkdown/.test(c.url)), 'export en lecture seule');
  assert.ok(!calls.some((c) => c.init.method && c.init.method !== 'POST' && /drive/.test(c.url)), 'aucune écriture sur Drive');
});

test('Google : liens de cellule (hyperlien, formule, texte brut)', () => {
  assert.equal(extractLink({ hyperlink: 'https://x/y' }), 'https://x/y');
  assert.equal(extractLink({ userEnteredValue: { formulaValue: '=HYPERLINK("https://a/b","doc")' } }), 'https://a/b');
  assert.equal(extractLink({ formattedValue: 'https://c/d' }), 'https://c/d');
  assert.equal(extractLink({ formattedValue: 'rien' }), null);
});

// ---------- règles du Sheet ----------
test('Sheet : « à intégrer » exact, dates en série, colonnes par nom', () => {
  assert.ok(isToIntegrate('à intégrer') && isToIntegrate('  à intégrer '));
  for (const s of ["En cours d'examen", 'Publié', '', 'à intégrer plus tard', 'a intégrer', 'À intégrer']) assert.ok(!isToIntegrate(s), s);
  assert.equal(sheetSerial('2026-10-26'), 46321);
  assert.equal(columnLetter(0), 'A'); assert.equal(columnLetter(5), 'F'); assert.equal(columnLetter(26), 'AA');
  assert.match(parisDate(), /^\d{4}-\d{2}-\d{2}$/);
});

// ---------- simulation complète ----------
const DOC = (n) => `DOC${String(n).padStart(2, '0')}ABCDEFGHIJKLMNOPQRSTUVW`.slice(0, 28);
const LONG = 'Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot. '.repeat(2);
const mdOf = (title) => `# ${title}\n\n${LONG}\n\n## Une section\n\n${LONG}\n`;

function makeWorld({ rows, docs = {}, existing, verifyOk = true, checkOk = true, pushOk = true, sheetWriteOk = true, batchFailsOnce = false } = {}) {
  const events = [];
  const header = { row: 1, cells: ['Titre', 'Catégorie', 'Détails', 'Propriétaire', 'État', 'Date de publication', 'Fichier', 'Notes'].map((t) => ({ text: t, link: null })) };
  const grid = [header, ...rows.map((r, i) => ({
    row: i + 2,
    cells: [{ text: r.title }, { text: r.cat ?? 'Etapes VAE' }, { text: '' }, { text: '' }, { text: r.status }, { text: '' }, { text: 'doc', link: r.doc ? `https://docs.google.com/document/d/${r.doc}/edit` : null }, { text: '' }],
  }))];
  let state = { auto: [], targets: {}, committed: [] };
  const pending = { auto: null };
  const world = {
    events, grid, state,
    deps: {
      sheet: {
        read: async () => { events.push('sheet.read'); return grid; },
        recheck: async (row) => { const { items } = parseSheet(grid); const it = items.find((i) => i.row === row); return { title: it.title, status: it.status.trim(), docId: it.docId }; },
        markPublished: async (row, serial) => {
          if (!sheetWriteOk) throw new Error('quota Google dépassé');
          events.push(`sheet.mark:${row}:${serial}`);
          grid[row - 1].cells[4].text = 'Publié'; grid[row - 1].cells[5].text = String(serial);
        },
      },
      docs: { exportMarkdown: async (id) => { events.push(`doc:${id}`); if (!(id in docs)) throw new Error('Requested entity was not found'); return docs[id]; } },
      repo: {
        existing: async () => existing ?? { all: state.committed.map((e) => ({ slug: e.slug, docId: e.source.docId, row: e.source.sheetRow, updatedAt: e.updatedAt })), auto: state.auto, targets: state.targets, reserved: ['recherche'], pages: ['index'] },
        write: async ({ auto }) => { pending.auto = auto; events.push(`repo.write:${auto.length}`); },
        images: async () => { events.push('repo.images'); },
        check: async () => {
          events.push('repo.check');
          if (batchFailsOnce && pending.auto.length > 1 && !world.failedOnce) { world.failedOnce = true; return { ok: false, detail: 'build cassé' }; }
          if (batchFailsOnce && pending.auto.some((e) => e.title.includes('MAUVAIS'))) return { ok: false, detail: 'build cassé (MAUVAIS)' };
          return checkOk ? { ok: true } : { ok: false, detail: 'build cassé' };
        },
        commit: async (m) => { events.push('repo.commit'); state.auto = pending.auto; state.committed = state.auto; },
        reset: async () => { events.push('repo.reset'); },
        push: async () => { if (!pushOk) throw new Error('rejeté'); events.push('repo.push'); },
      },
      site: { verify: async (slug) => { events.push(`site.verify:${slug}`); return verifyOk ? { ok: true } : { ok: false, detail: 'HTTP 404' }; } },
    },
  };
  return world;
}
const run = (w, extra = {}) => runPublication({ deps: w.deps, today: '2026-10-27', log: silent, ...extra });
const outcomeOf = (rep, row) => rep.results.find((r) => r.row === row)?.outcome;

test('aucune ligne « à intégrer » : rien n’est écrit, ni dépôt ni Sheet', async () => {
  const w = makeWorld({ rows: [{ title: 'Déjà fait', status: 'Publié', doc: DOC(1) }, { title: 'En attente', status: "En cours d'examen", doc: DOC(2) }], docs: { [DOC(1)]: mdOf('a'), [DOC(2)]: mdOf('b') } });
  const rep = await run(w);
  assert.equal(rep.changed, false);
  assert.deepEqual(w.events, ['sheet.read']);
});

test('publication nominale : ordre dépôt → envoi → vérification en ligne → Sheet, et « En cours d’examen » jamais touché', async () => {
  const w = makeWorld({
    rows: [{ title: 'Nouvelle règle de la VAE ?', status: 'à intégrer', doc: DOC(1) }, { title: 'Pas prêt', status: "En cours d'examen", doc: DOC(2) }],
    docs: { [DOC(1)]: mdOf('Nouvelle règle de la VAE ?'), [DOC(2)]: mdOf('Pas prêt') },
  });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'publié');
  assert.equal(rep.results.length, 1, 'la ligne 3 (En cours d’examen) est ignorée');
  const order = w.events.filter((e) => /^(repo\.(write|images|check|commit|push)|site\.verify|sheet\.mark)/.test(e));
  assert.deepEqual(order.map((e) => e.split(':')[0]), ['repo.write', 'repo.images', 'repo.check', 'repo.commit', 'repo.push', 'site.verify', 'sheet.mark']);
  assert.ok(w.events.includes('sheet.mark:2:' + sheetSerial('2026-10-27')));
  assert.equal(w.grid[1].cells[4].text, 'Publié');
  assert.equal(w.grid[2].cells[4].text, "En cours d'examen");
  assert.equal(w.state.auto[0].slug, 'nouvelle-regle-de-la-vae');
  assert.deepEqual(w.state.auto[0].categories, ['Etapes VAE']);
  assert.equal(w.state.auto[0].source.docId, DOC(1));
  assert.ok(!w.events.some((e) => e === `doc:${DOC(2)}`), 'le Doc « En cours d’examen » n’est même pas lu');
});

test('un seul article par jour : 5 articles « à intégrer » → seul le premier est publié, les autres ne sont ni lus ni modifiés', async () => {
  const w = makeWorld({
    rows: [1, 2, 3, 4, 5].map((n) => ({ title: `Article du jour numéro ${n}`, status: 'à intégrer', doc: DOC(n) })),
    docs: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [DOC(n), mdOf('x')])),
  });
  const rep = await run(w);
  assert.equal(rep.results.length, 1);
  assert.equal(outcomeOf(rep, 2), 'publié');
  assert.equal(w.state.auto.length, 1);
  assert.equal(w.events.filter((e) => e === 'repo.commit').length, 1);
  assert.equal(w.events.filter((e) => e.startsWith('sheet.mark')).length, 1);
  for (const r of [3, 4, 5, 6]) assert.equal(w.grid[r - 1].cells[4].text, 'à intégrer', `ligne ${r} intacte`);
  for (const n of [2, 3, 4, 5]) assert.ok(!w.events.includes(`doc:${DOC(n)}`), `Doc ${n} non lu`);
});

test('un seul article par jour : relance le même jour → rien de plus n’est publié', async () => {
  const w = makeWorld({
    rows: [1, 2, 3].map((n) => ({ title: `Article du jour numéro ${n}`, status: 'à intégrer', doc: DOC(n) })),
    docs: Object.fromEntries([1, 2, 3].map((n) => [DOC(n), mdOf('x')])),
  });
  await run(w);
  const again = await run(w);
  assert.equal(again.changed, false);
  assert.equal(again.results.length, 0);
  assert.match(again.summary, /déjà été publié aujourd’hui/);
  assert.equal(w.state.auto.length, 1);
  assert.equal(w.grid[2].cells[4].text, 'à intégrer');
  // le lendemain : le suivant est publié
  const next = await run(w, { today: '2026-10-28' });
  assert.equal(outcomeOf(next, 3), 'publié');
  assert.equal(w.state.auto.length, 2);
  assert.equal(w.grid[3].cells[4].text, 'à intégrer');
});

test('un seul article par jour : en cas d’échec du premier, on s’arrête, la cause est enregistrée et l’article reste « à intégrer »', async () => {
  const w = makeWorld({
    rows: [{ title: 'Catégorie inventée', status: 'à intégrer', doc: DOC(1), cat: 'Nouveauté' }, { title: 'Article suivant valide', status: 'à intégrer', doc: DOC(2) }],
    docs: { [DOC(1)]: mdOf('x'), [DOC(2)]: mdOf('x') },
  });
  const rep = await run(w);
  assert.equal(rep.results.length, 1);
  assert.equal(outcomeOf(rep, 2), 'erreur');
  assert.match(rep.results[0].detail, /catégorie inconnue/);
  assert.equal(w.state.auto.length, 0);
  assert.equal(w.grid[1].cells[4].text, 'à intégrer');
  assert.equal(w.grid[2].cells[4].text, 'à intégrer');
  assert.ok(!w.events.some((e) => e.startsWith('sheet.mark')));
});

test('validations conservées : Doc inaccessible, catégorie manquante, absence de lien → erreur claire, ligne intacte', async () => {
  for (const [row, expect] of [[{ title: 'Doc introuvable', status: 'à intégrer', doc: DOC(2) }, /inaccessible/], [{ title: 'Sans catégorie', status: 'à intégrer', doc: DOC(4), cat: '' }, /catégorie manquante/], [{ title: 'Sans lien', status: 'à intégrer', doc: null }, /lien vers le Google Doc/]]) {
    const w = makeWorld({ rows: [row], docs: { [DOC(4)]: mdOf('x') } });
    const rep = await run(w);
    assert.equal(outcomeOf(rep, 2), 'erreur');
    assert.match(rep.results[0].detail, expect);
    assert.equal(w.grid[1].cells[4].text, 'à intégrer');
  }
});

test('page introuvable en ligne : le Sheet n’est PAS modifié', async () => {
  const w = makeWorld({ rows: [{ title: 'Article en attente de déploiement', status: 'à intégrer', doc: DOC(1) }], docs: { [DOC(1)]: mdOf('x') }, verifyOk: false });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'erreur');
  assert.equal(w.grid[1].cells[4].text, 'à intégrer');
  assert.ok(!w.events.some((e) => e.startsWith('sheet.mark')));
});

test('relance après un échec de vérification : pas de doublon, l’article déjà intégré est vérifié puis marqué', async () => {
  const w = makeWorld({ rows: [{ title: 'Article relancé sans doublon', status: 'à intégrer', doc: DOC(1) }], docs: { [DOC(1)]: mdOf('x') }, verifyOk: false });
  await run(w);
  assert.equal(w.state.auto.length, 1);
  w.deps.site.verify = async () => ({ ok: true });
  w.events.length = 0;
  const rep2 = await run(w);
  assert.equal(outcomeOf(rep2, 2), 'publié');
  assert.equal(w.state.auto.length, 1, 'toujours un seul article');
  assert.ok(!w.events.some((e) => e.startsWith('repo.write') || e === 'repo.push'), 'rien n’est réécrit ni renvoyé');
  assert.equal(w.grid[1].cells[4].text, 'Publié');
  const rep3 = await run(w);
  assert.equal(rep3.changed, false, 'troisième passage : plus rien à faire');
});

test('échec des contrôles (tests/build) : rien n’est validé, ni envoyé, ni marqué', async () => {
  const w = makeWorld({ rows: [{ title: 'Article qui casse le site', status: 'à intégrer', doc: DOC(1) }], docs: { [DOC(1)]: mdOf('x') }, checkOk: false });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'erreur');
  assert.ok(w.events.includes('repo.reset'));
  assert.ok(!w.events.includes('repo.commit') && !w.events.includes('repo.push'));
  assert.equal(w.grid[1].cells[4].text, 'à intégrer');
});

test('contrôles qui échouent sur l’article du jour : il reste « à intégrer », le suivant n’est pas tenté', async () => {
  const w = makeWorld({
    rows: [{ title: 'MAUVAIS article du jour', status: 'à intégrer', doc: DOC(1) }, { title: 'Bon article du lendemain', status: 'à intégrer', doc: DOC(2) }],
    docs: { [DOC(1)]: mdOf('x'), [DOC(2)]: mdOf('x') }, batchFailsOnce: true,
  });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'erreur');
  assert.equal(rep.results.length, 1);
  assert.equal(w.state.auto.length, 0);
  assert.equal(w.grid[1].cells[4].text, 'à intégrer');
  assert.equal(w.grid[2].cells[4].text, 'à intégrer');
});

test('envoi GitHub refusé : aucun marquage « Publié »', async () => {
  const w = makeWorld({ rows: [{ title: 'Article non envoyé', status: 'à intégrer', doc: DOC(1) }], docs: { [DOC(1)]: mdOf('x') }, pushOk: false });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'erreur');
  assert.ok(!w.events.some((e) => e.startsWith('sheet.mark') || e.startsWith('site.verify')));
});

test('écriture du Sheet impossible : signalé en erreur, jamais « publié » à tort', async () => {
  const w = makeWorld({ rows: [{ title: 'Article sans mise à jour du Sheet', status: 'à intégrer', doc: DOC(1) }], docs: { [DOC(1)]: mdOf('x') }, sheetWriteOk: false });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'erreur');
  assert.equal(w.grid[1].cells[4].text, 'à intégrer');
});

test('simulation : rien n’est écrit', async () => {
  const w = makeWorld({ rows: [{ title: 'Article en simulation', status: 'à intégrer', doc: DOC(1) }], docs: { [DOC(1)]: mdOf('x') } });
  const rep = await run(w, { dryRun: true });
  assert.equal(outcomeOf(rep, 2), 'simulation');
  assert.ok(!w.events.some((e) => /^(repo\.|sheet\.mark|site\.)/.test(e)));
});

test('Doc trop court ou vide : refusé', async () => {
  const w = makeWorld({ rows: [{ title: 'Article presque vide', status: 'à intégrer', doc: DOC(1) }], docs: { [DOC(1)]: '# T\n\nBonjour.' } });
  const rep = await run(w);
  assert.match(rep.results[0].detail, /trop court/);
});

// ---------- vérification en ligne ----------
test('vérification en ligne : attend le déploiement, exige le titre, abandonne au bout du délai', async () => {
  let t = 0, n = 0;
  const site = realSite({
    siteUrl: 'https://exemple.test', timeoutMs: 120_000, intervalMs: 30_000, nowMs: () => t, sleep: async (ms) => { t += ms; },
    fetchImpl: async () => (++n < 3 ? { ok: false, status: 404, text: async () => '' } : { ok: true, status: 200, text: async () => '<title>L&#39;article &amp; sa règle</title>' }),
  });
  assert.equal((await site.verify('x', "L'article & sa règle")).ok, true);
  const never = realSite({ siteUrl: 'https://exemple.test', timeoutMs: 90_000, intervalMs: 30_000, nowMs: () => t, sleep: async (ms) => { t += ms; }, fetchImpl: async () => ({ ok: true, status: 200, text: async () => '<title>Autre page</title>' }) });
  const r = await never.verify('x', 'Mon titre');
  assert.equal(r.ok, false);
  assert.match(r.detail, /titre introuvable/);
});

// ---------- essai réel sur une copie du dépôt (fichiers, illustrations, tests de données) ----------
test('copie réelle du dépôt : article ajouté, illustration créée, données et tests valides, relance sans doublon', { skip: !!process.env.INFOVAE_NESTED }, async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'infovae-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  for (const d of ['src', 'scripts', 'tests', 'netlify', 'apps-script', 'public/images/articles', 'docs']) fs.cpSync(path.join(repoRoot, d), path.join(tmp, d), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(tmp, 'package.json'));
  const git = (...a) => execFileSync('git', a, { cwd: tmp, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
  git('init', '-q'); git('add', '-A'); git('commit', '-q', '-m', 'base');
  process.env.SKIP_BUILD = '1';
  process.env.INFOVAE_NESTED = '1'; // le `npm test` lancé dans la copie ne relance pas cet essai (évite la boucle)
  const base = realRepo(tmp);
  const repo = { ...base, push: async () => {} };
  const w = makeWorld({
    rows: [{ title: 'Que faire après un refus de recevabilité de sa VAE ?', status: 'à intégrer', doc: DOC(9), cat: 'Etapes VAE, Financement' }],
    docs: { [DOC(9)]: mdOf('x') },
  });
  w.deps.repo = repo;
  const rep = await run(w);
  delete process.env.SKIP_BUILD;
  delete process.env.INFOVAE_NESTED;
  assert.equal(outcomeOf(rep, 2), 'publié', JSON.stringify(rep.results));
  const slug = 'que-faire-apres-un-refus-de-recevabilite-de-sa-vae';
  assert.ok(fs.existsSync(path.join(tmp, 'public/images/articles', `${slug}.svg`)), 'illustration créée');
  assert.match(fs.readFileSync(path.join(tmp, 'src/data/images.js'), 'utf8'), new RegExp(slug));
  const list = JSON.parse(execFileSync('node', ['scripts/publish/list-existing.mjs', tmp], { cwd: tmp, encoding: 'utf8', maxBuffer: 1 << 26 }));
  const added = list.all.find((a) => a.slug === slug);
  assert.ok(added && added.docId === DOC(9) && added.row === 2);
  assert.deepEqual(list.auto[0].categories, ['Etapes VAE', 'Financement']);
  assert.ok(list.targets[slug]?.[0].startsWith('Que faire après un refus'));
  assert.match(list.alts[slug], /^Sur le thème : Que faire après un refus/);
  assert.match(git('log', '--oneline', '-1'), /Publication automatique/);
  // relance : aucun doublon
  w.grid[1].cells[4].text = 'à intégrer';
  const again = await run(w);
  assert.equal(outcomeOf(again, 2), 'publié');
  const list2 = JSON.parse(execFileSync('node', ['scripts/publish/list-existing.mjs', tmp], { cwd: tmp, encoding: 'utf8', maxBuffer: 1 << 26 }));
  assert.equal(list2.auto.length, 1);
  assert.equal(git('log', '--oneline').trim().split('\n').length, 2, 'aucun second commit');
});


// ============================================================================
// Passerelle Google Apps Script (apps-script/publication/Code.gs) — exécutée dans un environnement simulé
// ============================================================================
const SECRET = 'a'.repeat(16) + 'b'.repeat(16) + 'c'.repeat(16);
const SHEET_REF = '1UBLJzkL7PZEPU9mf6C3PrB7ds-Htj-48m4Sqdsw3Qe8';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEXEMPLEEXEMPLE/exec';
const DOCID = (n) => `DOCUMENT${String(n).padStart(2, '0')}ABCDEFGHIJKLMNOPQRS`;

function makeGateway({ rows, docs = {}, secret = SECRET, tab = 'Feuille 1', chips = false }) {
  const header = ['Titre', 'Catégorie', 'Détails', 'Propriétaire', 'État', 'Date de publication', 'Fichier', 'Notes'];
  const grid = [header.map((t) => ({ text: t })), ...rows.map((r) => [
    { text: r.title }, { text: r.cat ?? 'Etapes VAE' }, { text: '' }, { text: '' }, { text: r.status }, { text: r.date ?? '' },
    { text: 'doc', link: r.doc && !chips ? `https://docs.google.com/document/d/${r.doc}/edit` : null }, { text: '' },
  ])];
  const driveCalls = [];
  const writes = [];
  const sheet = {
    getLastRow: () => grid.length, getLastColumn: () => grid[0].length,
    getRange(r, c, nr = 1, nc = 1) {
      const cells = () => grid.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc));
      const one = () => grid[r - 1][c - 1];
      return {
        getDisplayValues: () => cells().map((row) => row.map((x) => x.text)),
        getRichTextValues: () => cells().map((row) => row.map((x) => ({ getLinkUrl: () => x.link ?? null, getRuns: () => [] }))),
        getFormulas: () => cells().map((row) => row.map(() => '')),
        getDisplayValue: () => one().text,
        setValue(v) { writes.push([r, c]); one().value = v; one().text = v && v.iso ? v.iso.split('-').reverse().join('/') : String(v); },
        setNumberFormat(f) { one().fmt = f; },
      };
    },
  };
  const props = new Map(secret ? [['INFO_VAE_SECRET', secret]] : []);
  const cache = new Map();
  const ctx = vm.createContext({
    console: { log() {}, error() {} }, JSON, Date, Math, String, Number, Array, Object, RegExp, Error, encodeURIComponent,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => (n === tab ? sheet : null), getId: () => SHEET_REF }), flush() {} },
    ScriptApp: { getOAuthToken: () => 'oauth-token-simule' },
    UrlFetchApp: {
      fetch(url, opts) {
        driveCalls.push({ url, method: opts.method });
        if (url.includes('/spreadsheets/d/')) {
          const links = rows.map((r, i) => (r.doc ? `<hyperlink r:id="rId${i + 1}" ref="G${i + 2}"/>` : '')).join('');
          const rels = rows.map((r, i) => (r.doc ? `<Relationship Id="rId${i + 1}" Target="https://docs.google.com/document/d/${r.doc}/edit?usp=sharing&amp;x=1" TargetMode="External"/>` : '')).join('');
          const parts = {
            'xl/workbook.xml': `<workbook><sheets><sheet name="Autre" sheetId="1" r:id="rId9"/><sheet name="${tab}" sheetId="2" r:id="rId2"/></sheets></workbook>`,
            'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId9" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
            'xl/worksheets/sheet2.xml': `<worksheet><hyperlinks>${links}</hyperlinks></worksheet>`,
            'xl/worksheets/_rels/sheet2.xml.rels': `<Relationships>${rels}</Relationships>`,
          };
          return { getResponseCode: () => 200, getBlob: () => { const b = { parts, setContentType: () => b }; return b; } };
        }
        const id = decodeURIComponent(/document\/d\/([^/]+)\/export/.exec(url)[1]);
        return id in docs ? { getResponseCode: () => 200, getContentText: () => docs[id] } : { getResponseCode: () => 404, getContentText: () => '' };
      },
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType() { return { getContent: () => t }; } }) },
    Utilities: {
      unzip: (blob) => Object.entries(blob.parts).map(([name, text]) => ({ getName: () => name, getDataAsString: () => text })),
      computeHmacSha256Signature: (v, k) => Int8Array.from(crypto.createHmac('sha256', k).update(v).digest()),
      parseDate: (s) => ({ iso: s }),
    },
  });
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'apps-script/publication/Code.gs'), 'utf8'), ctx);
  const bodies = [];
  const fetchImpl = async (url, init) => {
    bodies.push(init.body);
    assert.equal(init.method, 'POST');
    const out = ctx.doPost({ postData: { contents: init.body } });
    const text = out.getContent();
    return { ok: true, status: 200, json: async () => JSON.parse(text) };
  };
  return { ctx, grid, driveCalls, writes, fetchImpl, bodies, props };
}
const clientFor = (gw, extra = {}) => createAppsScriptClient({ url: SCRIPT_URL, secret: SECRET, fetchImpl: gw.fetchImpl, sleep: async () => {}, ...extra });
const sampleRows = () => [
  { title: 'Article à publier', status: 'à intégrer', doc: DOCID(1) },
  { title: 'Article en examen', status: "En cours d'examen", doc: DOCID(2) },
  { title: 'Déjà publié', status: 'Publié', doc: DOCID(3), date: '01/10/2026' },
];

test('Apps Script : ping signé accepté ; mauvais secret, secret absent, requête rejouée ou périmée refusés', async () => {
  const gw = makeGateway({ rows: sampleRows() });
  const info = await clientFor(gw).ping();
  assert.equal(info.version, '1.4');
  assert.equal(info.sheetId, SHEET_REF);
  await assert.rejects(createAppsScriptClient({ url: SCRIPT_URL, secret: 'z'.repeat(40), fetchImpl: gw.fetchImpl, sleep: async () => {} }).ping(), /unauthorized/);
  const none = makeGateway({ rows: sampleRows(), secret: null });
  await assert.rejects(clientFor(none).ping(), /unavailable/);
  // rejeu : même corps envoyé deux fois
  await clientFor(gw).ping();
  const replayBody = gw.bodies[gw.bodies.length - 1];
  const again = JSON.parse(gw.ctx.doPost({ postData: { contents: replayBody } }).getContent());
  assert.equal(again.error, 'replay');
  // périmée : horloge du client une heure en retard
  await assert.rejects(clientFor(gw, { nowMs: () => Date.now() - 3600_000 }).ping(), /expired/);
  // charge utile modifiée après signature
  const tampered = JSON.parse(replayBody);
  tampered.payload = tampered.payload.replace('ping', 'readSheet');
  assert.equal(JSON.parse(gw.ctx.doPost({ postData: { contents: JSON.stringify(tampered) } }).getContent()).error, 'unauthorized');
  assert.equal(JSON.parse(gw.ctx.doPost({ postData: { contents: 'pas du json' } }).getContent()).ok, false);
  assert.equal(JSON.parse(gw.ctx.doGet().getContent()).ok, false);
});

test('Apps Script : le secret ne voyage jamais dans les requêtes ni dans les réponses d’erreur', async () => {
  const gw = makeGateway({ rows: sampleRows(), docs: { [DOCID(1)]: '# T' } });
  const c = clientFor(gw);
  await c.ping(); await c.readSheet(); await c.exportDocMarkdown(DOCID(1));
  await assert.rejects(c.exportDocMarkdown('ABCDEFGHIJKLMNOPQRSTUV'), (e) => !e.message.includes(SECRET));
  for (const b of gw.bodies) assert.ok(!b.includes(SECRET), 'secret dans une requête');
});

test('Apps Script : lecture du Sheet (textes + liens) et des Docs liés, en lecture seule', async () => {
  const gw = makeGateway({ rows: sampleRows(), docs: { [DOCID(1)]: '# Titre\n\nTexte', [DOCID(3)]: '# Autre' } });
  const c = clientFor(gw);
  const rows = await c.readSheet();
  assert.equal(rows.length, 4);
  assert.equal(rows[1].cells[0].text, 'Article à publier');
  assert.equal(docIdFromUrl(rows[1].cells[6].link), DOCID(1));
  const { items } = parseSheet(rows);
  assert.deepEqual(items.filter((i) => isToIntegrate(i.status)).map((i) => i.row), [2]);
  assert.match(await c.exportDocMarkdown(DOCID(1)), /Texte/);
  assert.ok(gw.driveCalls.every((d) => d.method === 'get' && /\/export\?format=(md|xlsx)$/.test(d.url) && !/googleapis\.com/.test(d.url)), 'uniquement des exports en lecture, sans API Drive');
  assert.equal(gw.writes.length, 0, 'aucune écriture dans le Sheet');
  await assert.rejects(c.exportDocMarkdown(DOCID(9)), /non référencé/);   // Doc absent du Sheet
  await assert.rejects(c.exportDocMarkdown('../etc/passwd'), /invalide/);
  assert.equal(gw.driveCalls.length, 1, 'aucun appel Drive pour un Doc refusé');
});

test('Apps Script : markPublished n’écrit que État et Date, après revérification de la ligne', async () => {
  const gw = makeGateway({ rows: sampleRows() });
  const c = clientFor(gw);
  const ok = { row: 2, title: 'Article à publier', docId: DOCID(1), date: '2026-10-27' };
  await assert.rejects(c.markPublished({ ...ok, title: 'Autre titre' }), /a changé/);
  await assert.rejects(c.markPublished({ ...ok, docId: DOCID(7) }), /a changé/);
  await assert.rejects(c.markPublished({ ...ok, row: 3, title: 'Article en examen', docId: DOCID(2) }), /état inattendu/);
  await assert.rejects(c.markPublished({ ...ok, row: 1 }), /invalide/);
  await assert.rejects(c.markPublished({ ...ok, row: 99999 }), /invalide/);
  await assert.rejects(c.markPublished({ ...ok, date: '27/10/2026' }), /date invalide/);
  assert.equal(gw.writes.length, 0, 'tous les refus ont lieu avant toute écriture');
  const res = await c.markPublished(ok);
  assert.equal(res.status, 'Publié');
  assert.deepEqual(gw.writes, [[2, 5], [2, 6]], 'colonnes E et F de la ligne 2 seulement');
  assert.equal(gw.grid[1][5].value.iso, '2026-10-27');
  assert.equal(gw.grid[1][5].fmt, 'dd/MM/yyyy');
  assert.equal(gw.grid[2][4].text, "En cours d'examen");
  const again = await c.markPublished(ok);
  assert.equal(again.alreadyPublished, true, 'idempotent');
  assert.equal(gw.writes.length, 2);
});

test('Apps Script : l’adresse du déploiement est contrôlée, le secret doit être assez long', () => {
  assert.ok(validateScriptUrl(SCRIPT_URL));
  for (const bad of ['http://script.google.com/macros/s/AKfy/exec', 'https://exemple.com/macros/s/AKfy/exec', 'https://script.google.com/macros/s/AKfy/dev', 'pas une adresse', 'https://script.google.com.evil.com/macros/s/AKfy/exec'])
    assert.throws(() => validateScriptUrl(bad), /APPS_SCRIPT_URL/, bad);
  assert.throws(() => createAppsScriptClient({ url: SCRIPT_URL, secret: 'court' }), /trop court/);
});

test('Apps Script : réponse HTML (déploiement non public) → message clair', async () => {
  const c = createAppsScriptClient({ url: SCRIPT_URL, secret: SECRET, sleep: async () => {}, fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('html'); } }) });
  await assert.rejects(c.ping(), /Tout le monde/);
});

test('choix de l’accès Google : Apps Script si ses deux secrets existent, sinon compte de service, sinon rien', () => {
  const cfg = { sheetId: 'x', tab: 'Feuille 1' };
  assert.equal(createBackend({ APPS_SCRIPT_URL: SCRIPT_URL, APPS_SCRIPT_SECRET: SECRET }, cfg).kind, 'apps-script');
  assert.equal(createBackend({ APPS_SCRIPT_URL: SCRIPT_URL }, cfg), null);
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const json = JSON.stringify({ client_email: 'a@b.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
  assert.equal(createBackend({ GOOGLE_SERVICE_ACCOUNT_JSON: json }, cfg).kind, 'service-account');
  assert.equal(createBackend({ APPS_SCRIPT_URL: SCRIPT_URL, APPS_SCRIPT_SECRET: SECRET, GOOGLE_SERVICE_ACCOUNT_JSON: json }, cfg).kind, 'apps-script');
  assert.equal(createBackend({}, cfg), null);
});

test('Apps Script, de bout en bout : publication complète via la passerelle, « Publié » écrit seulement après la vérification en ligne', async () => {
  const gw = makeGateway({
    rows: [
      { title: 'Nouvelle règle de la VAE ?', status: 'à intégrer', doc: DOCID(1), cat: 'Etapes VAE' },
      { title: 'Catégorie inventée', status: 'à intégrer', doc: DOCID(2), cat: 'Nouveauté' },
      { title: 'En examen', status: "En cours d'examen", doc: DOCID(3) },
    ],
    docs: { [DOCID(1)]: mdOf('x'), [DOCID(2)]: mdOf('x'), [DOCID(3)]: mdOf('x') },
  });
  const backend = { kind: 'apps-script', ...clientFor(gw) };
  const w = makeWorld({ rows: [], docs: {} });
  w.deps.sheet = sheetAdapter({ backend });
  w.deps.docs = { exportMarkdown: (id) => backend.exportDocMarkdown(id) };
  let sheetWrittenBeforeVerify = null;
  w.deps.site.verify = async (slug) => { sheetWrittenBeforeVerify = gw.writes.length; w.events.push(`site.verify:${slug}`); return { ok: true }; };
  const rep = await run(w);
  assert.equal(sheetWrittenBeforeVerify, 0, 'rien n’est écrit dans le Sheet avant la vérification en ligne');
  assert.equal(outcomeOf(rep, 2), 'publié');
  assert.equal(rep.results.length, 1, 'un seul article traité');
  assert.equal(gw.grid[1][4].text, 'Publié');
  assert.equal(gw.grid[1][5].value.iso, '2026-10-27');
  assert.equal(gw.grid[2][4].text, 'à intégrer');
  assert.equal(gw.grid[3][4].text, "En cours d'examen");
  assert.ok(!JSON.stringify(rep).includes(SECRET));
  assert.equal(w.state.auto.length, 1);
  assert.equal(w.state.auto[0].source.docId, DOCID(1));
  // le robot ne lit jamais le Doc « En cours d'examen »
  assert.ok(!gw.driveCalls.some((d) => d.url.includes(DOCID(3))));
});

test('Sheet de référence : identifiant par défaut = copie officielle du 27/10/2026, et contrôle de la passerelle', async () => {
  assert.equal(DEFAULTS.sheetId, SHEET_REF);
  assert.ok(!fs.readFileSync(path.join(repoRoot, 'scripts/publish/run.mjs'), 'utf8').match(/sheetId: '1LlVOvy/), 'ancien identifiant retiré');
  const gw = makeGateway({ rows: sampleRows() });
  const backend = { kind: 'apps-script', ...clientFor(gw) };
  await checkGateway(backend, SHEET_REF);                                              // bon Sheet : accepté
  await assert.rejects(checkGateway(backend, '1LlVOvyMw3hoJ18ZUe58JjqcV42eJ30gQeL_Ow2oEjeQ'), /autre Sheet/);   // ancien Sheet : refusé
  await assert.rejects(checkGateway({ kind: 'apps-script', ping: async () => ({ version: '1.0' }) }, SHEET_REF), /ancienne version/);
  await checkGateway({ kind: 'service-account' }, SHEET_REF);                           // compte de service : pas concerné
});

test('Apps Script : HTTP 401/403 → explication claire du déploiement non public, sans nouvelle tentative', async () => {
  let calls = 0;
  const c = createAppsScriptClient({ url: SCRIPT_URL, secret: SECRET, sleep: async () => {}, fetchImpl: async () => { calls++; return { ok: false, status: 401 }; } });
  await assert.rejects(c.ping(), /pas public.*Tout le monde/);
  assert.equal(calls, 1);
  const n = createAppsScriptClient({ url: SCRIPT_URL, secret: SECRET, sleep: async () => {}, fetchImpl: async () => ({ ok: false, status: 404 }) });
  await assert.rejects(n.ping(), /APPS_SCRIPT_URL erronée/);
});

test('Apps Script : liens des « puces intelligentes » (cellules sans lien lisible) retrouvés via l’export Excel, lecture seule', async () => {
  const gw = makeGateway({ rows: sampleRows(), chips: true, docs: { [DOCID(1)]: '# T\n\nTexte du Doc' } });
  const c = clientFor(gw);
  const rows = await c.readSheet();
  assert.equal(docIdFromUrl(rows[1].cells[6].link), DOCID(1));
  assert.equal(docIdFromUrl(rows[3].cells[6].link), DOCID(3));
  assert.match(await c.exportDocMarkdown(DOCID(1)), /Texte du Doc/);   // le Doc est maintenant « référencé »
  await assert.rejects(c.exportDocMarkdown(DOCID(9)), /non référencé/);
  assert.ok(gw.driveCalls.every((d) => d.method === 'get'), 'uniquement des lectures');
  assert.equal(gw.writes.length, 0);
  const { items } = parseSheet(rows);
  assert.equal(items.find((i) => i.row === 2).docId, DOCID(1));
});

test('hébergement : adresse par défaut Vercel, Netlify refusé, adresse invalide refusée', () => {
  assert.equal(DEFAULTS.siteUrl, 'https://info-vae.vercel.app');
  assert.equal(checkSiteUrl(DEFAULTS.siteUrl), DEFAULTS.siteUrl);
  assert.throws(() => checkSiteUrl('https://info-vae.netlify.app'), /Netlify/);
  assert.throws(() => checkSiteUrl('pas une adresse'), /invalide/);
});

test('vérification du site : message clair si Vercel protège le site (401) et mention Vercel', async () => {
  const mk = (res) => realSite({ siteUrl: 'https://exemple.test', timeoutMs: 1, intervalMs: 1, nowMs: (() => { let t = 0; return () => (t += 10); })(), sleep: async () => {}, fetchImpl: async () => res });
  const prot = await mk({ ok: false, status: 401, text: async () => '' }).verify('a', 'Titre');
  assert.equal(prot.ok, false);
  assert.match(prot.detail, /401.*Deployment Protection/);
  const ok = await mk({ ok: true, status: 200, headers: { get: (h) => (h === 'x-vercel-id' ? 'cdg1::x' : null) }, text: async () => '<title>Titre</title>' }).verify('a', 'Titre');
  assert.equal(ok.ok, true);
  assert.match(ok.detail, /Vercel/);
});

test('Apps Script : « Doc non référencé » passager → nouvel essai espacé, puis succès ; échec persistant → erreur après 6 essais', async () => {
  const gw = makeGateway({ rows: sampleRows(), docs: { [DOCID(1)]: '# T' } });
  const real = gw.fetchImpl;
  let n = 0;
  const flaky = async (url, init) => {
    const body = JSON.parse(JSON.parse(init.body).payload);
    if (body.action === 'exportDoc' && n++ < 2) return { ok: true, status: 200, json: async () => ({ ok: false, error: 'failed', detail: 'Doc non référencé dans le Sheet' }) };
    return real(url, init);
  };
  const waits = [];
  const c = createAppsScriptClient({ url: SCRIPT_URL, secret: SECRET, fetchImpl: flaky, sleep: async (ms) => { waits.push(ms); } });
  await c.exportDocMarkdown(DOCID(1));
  assert.equal(n, 3);
  assert.deepEqual(waits, [4000, 8000]);
  let calls = 0;
  const always = async () => { calls++; return { ok: true, status: 200, json: async () => ({ ok: false, error: 'failed', detail: 'Doc non référencé dans le Sheet' }) }; };
  const c2 = createAppsScriptClient({ url: SCRIPT_URL, secret: SECRET, fetchImpl: always, sleep: async () => {} });
  await assert.rejects(c2.exportDocMarkdown(DOCID(1)), /non référencé/);
  assert.equal(calls, 6);
});
