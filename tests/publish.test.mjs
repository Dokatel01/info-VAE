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
import { realRepo, realSite, sheetAdapter } from '../scripts/publish/run.mjs';

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

test('erreurs isolées : Doc inaccessible, catégorie inconnue, catégorie manquante, doublon de Doc — les autres sont publiés', async () => {
  const w = makeWorld({
    rows: [
      { title: 'Article valide numéro un', status: 'à intégrer', doc: DOC(1) },
      { title: 'Doc introuvable', status: 'à intégrer', doc: DOC(2) },
      { title: 'Catégorie inventée', status: 'à intégrer', doc: DOC(3), cat: 'Nouveauté' },
      { title: 'Sans catégorie', status: 'à intégrer', doc: DOC(4), cat: '' },
      { title: 'Doublon du premier', status: 'à intégrer', doc: DOC(1) },
      { title: 'Sans lien', status: 'à intégrer', doc: null },
      { title: 'Article valide numéro deux', status: 'à intégrer', doc: DOC(5) },
    ],
    docs: { [DOC(1)]: mdOf('x'), [DOC(3)]: mdOf('x'), [DOC(4)]: mdOf('x'), [DOC(5)]: mdOf('x') },
  });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'publié');
  assert.equal(outcomeOf(rep, 8), 'publié');
  for (const r of [3, 4, 5, 6, 7]) assert.equal(outcomeOf(rep, r), 'erreur', `ligne ${r}`);
  assert.match(rep.results.find((r) => r.row === 4).detail, /catégorie inconnue/);
  assert.match(rep.results.find((r) => r.row === 3).detail, /inaccessible/);
  assert.equal(w.state.auto.length, 2);
  for (const r of [3, 4, 5, 6, 7]) assert.equal(w.grid[r - 1].cells[4].text, 'à intégrer', `ligne ${r} non marquée`);
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

test('lot qui échoue : repli article par article, le bon est publié, le mauvais reste « à intégrer »', async () => {
  const w = makeWorld({
    rows: [{ title: 'Bon article du lot', status: 'à intégrer', doc: DOC(1) }, { title: 'MAUVAIS article du lot', status: 'à intégrer', doc: DOC(2) }],
    docs: { [DOC(1)]: mdOf('x'), [DOC(2)]: mdOf('x') }, batchFailsOnce: true,
  });
  const rep = await run(w);
  assert.equal(outcomeOf(rep, 2), 'publié');
  assert.equal(outcomeOf(rep, 3), 'erreur');
  assert.equal(w.state.auto.length, 1);
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
