// Planning des passages, garde du week-end, date unique et « un seul article par jour ».
// Lancer : node --test tests/passages-quotidiens.test.mjs
// (volontairement hors de « npm test » : on ne touche pas au script de test de l'automatisation).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runPublication, parseSheet, sheetSerial } from '../scripts/publish/pipeline.mjs';
import { resolveToday } from '../scripts/publish/run.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const yml = fs.readFileSync(path.join(root, '.github/workflows/publish-articles.yml'), 'utf8');

// ---------- le workflow ----------
test('4 passages par jour ouvré (6 h 17, 10 h 17, 14 h 17, 18 h 17 UTC), du lundi au vendredi', () => {
  const crons = [...yml.matchAll(/- cron: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(crons, ['17 6 * * 1-5', '17 10 * * 1-5', '17 14 * * 1-5', '17 18 * * 1-5']);
});
test('aucune contrainte d’heure dans le workflow', () => {
  assert.ok(!/date \+%H/.test(yml), 'plus de lecture de l’heure');
  assert.ok(!/HEURE_PARIS/.test(yml));
});
test('un seul passage à la fois, sans annulation du passage en cours', () => {
  assert.match(yml, /concurrency:\s*\n\s+group: publication-articles\s*\n\s+cancel-in-progress: false/);
});
test('la date relevée par la garde est transmise au robot', () => {
  assert.match(yml, /PUBLISH_TODAY: \$\{\{ steps\.garde\.outputs\.date \}\}/);
});

// ---------- la garde du week-end, exécutée pour de vrai avec une horloge simulée ----------
const step = yml.split('\n      - ').find((s) => s.startsWith('name: Garde du week-end'));
assert.ok(step, 'étape de garde introuvable');
const script = step.split('run: |\n')[1].split('\n').map((l) => l.replace(/^ {10}/, '')).join('\n');

function garde(utc, event = 'schedule') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garde-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'date'), '#!/bin/bash\nexec /usr/bin/date -d "$FAKE_UTC" "$@"\n', { mode: 0o755 });
  const out = path.join(dir, 'out');
  fs.writeFileSync(out, '');
  execFileSync('bash', ['-e', '-c', script.replaceAll('${{ github.event_name }}', event)], { env: { PATH: `${bin}:/usr/bin:/bin`, FAKE_UTC: utc, GITHUB_OUTPUT: out }, encoding: 'utf8' });
  const res = fs.readFileSync(out, 'utf8').trim().split('\n');
  fs.rmSync(dir, { recursive: true, force: true });
  return res;
}

test('jours ouvrés (Paris) : le passage a lieu, quelle que soit l’heure, y compris tard le soir ou la nuit (lun.→ven.)', () => {
  assert.deepEqual(garde('2026-11-16 05:17:00 UTC'), ['lancer=oui', 'date=2026-11-16']); // lundi 06 h 17 Paris
  assert.deepEqual(garde('2026-11-16 22:59:59 UTC'), ['lancer=oui', 'date=2026-11-16']); // lundi 23 h 59 Paris
  assert.deepEqual(garde('2026-11-16 23:00:00 UTC'), ['lancer=oui', 'date=2026-11-17']); // mardi 00 h 00 Paris : retard toléré, jour = mardi
  assert.deepEqual(garde('2026-11-17 00:34:38 UTC'), ['lancer=oui', 'date=2026-11-17']); // le cas réel du 17/11 (01 h 34 Paris)
});
test('week-end (Paris) : jamais de publication programmée, même retardée depuis le vendredi', () => {
  assert.deepEqual(garde('2026-11-20 22:59:59 UTC'), ['lancer=oui', 'date=2026-11-20']); // vendredi 23 h 59 Paris : encore vendredi
  assert.deepEqual(garde('2026-11-20 23:00:00 UTC'), ['lancer=non']);                    // samedi 00 h 00 Paris
  assert.deepEqual(garde('2026-11-21 03:00:00 UTC'), ['lancer=non']);                    // samedi
  assert.deepEqual(garde('2026-11-22 12:00:00 UTC'), ['lancer=non']);                    // dimanche
  assert.deepEqual(garde('2026-11-22 22:59:59 UTC'), ['lancer=non']);                    // dimanche 23 h 59 Paris
  assert.deepEqual(garde('2026-11-22 23:00:00 UTC'), ['lancer=oui', 'date=2026-11-23']); // lundi 00 h 00 Paris
});
test('fuseau Europe/Paris et changements d’heure (été UTC+2, hiver UTC+1)', () => {
  assert.deepEqual(garde('2026-07-10 22:00:00 UTC'), ['lancer=non']);                    // vendredi 10/07 22 h UTC = samedi 00 h Paris (été)
  assert.deepEqual(garde('2026-07-10 21:59:59 UTC'), ['lancer=oui', 'date=2026-07-10']);
  assert.deepEqual(garde('2026-10-25 00:30:00 UTC'), ['lancer=non']);                    // dimanche du changement d'heure d'hiver
  assert.deepEqual(garde('2026-03-29 12:00:00 UTC'), ['lancer=non']);                    // dimanche du changement d'heure d'été
});
test('lancements manuels et « push » : jamais bloqués par le week-end (le push n’autorise que des tests sans écriture)', () => {
  assert.deepEqual(garde('2026-11-21 10:00:00 UTC', 'workflow_dispatch'), ['lancer=oui', 'date=2026-11-21']);
  assert.deepEqual(garde('2026-11-21 10:00:00 UTC', 'push'), ['lancer=oui', 'date=2026-11-21']);
});

// ---------- la date transmise au robot ----------
test('resolveToday : la date de la garde est utilisée, sinon l’horloge de Paris', () => {
  assert.equal(resolveToday({ PUBLISH_TODAY: '2026-11-20' }, new Date('2026-11-20T23:30:00Z')), '2026-11-20'); // reste vendredi après minuit
  assert.equal(resolveToday({}, new Date('2026-11-20T10:00:00Z')), '2026-11-20');
  assert.equal(resolveToday({ PUBLISH_TODAY: '' }, new Date('2026-11-20T10:00:00Z')), '2026-11-20');
  for (const bad of ['demain', '2026-13-01', '2026-02-30', '2026-11-2', '2026-11-20; rm -rf /']) assert.equal(resolveToday({ PUBLISH_TODAY: bad }, new Date('2026-11-20T10:00:00Z')), '2026-11-20', bad);
});

// ---------- plusieurs passages dans la journée : un seul article, dans l'ordre du Sheet ----------
const DOC = (n) => `DOC${String(n).padStart(2, '0')}ABCDEFGHIJKLMNOPQRSTUVW`.slice(0, 28);
const LONG = 'Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot. '.repeat(2);
const mdOf = (title) => `# ${title}\n\n${LONG}\n\n## Une section\n\n${LONG}\n`;

function monde(n) {
  const events = [];
  const header = { row: 1, cells: ['Titre', 'Catégorie', 'Détails', 'Propriétaire', 'État', 'Date de publication', 'Fichier', 'Notes'].map((t) => ({ text: t, link: null })) };
  const grid = [header, ...Array.from({ length: n }, (_, i) => ({
    row: i + 2,
    cells: [{ text: `Article de test numéro ${i + 1}` }, { text: 'Etapes VAE' }, { text: '' }, { text: '' }, { text: 'à intégrer' }, { text: '' }, { text: 'doc', link: `https://docs.google.com/document/d/${DOC(i + 1)}/edit` }, { text: '' }],
  }))];
  let committed = [];
  let pending = null;
  const deps = {
    sheet: {
      read: async () => grid,
      recheck: async (row) => { const it = parseSheet(grid).items.find((x) => x.row === row); return { title: it.title, status: it.status.trim(), docId: it.docId }; },
      markPublished: async (row, serial) => { events.push(`mark:${row}`); grid[row - 1].cells[4].text = 'Publié'; grid[row - 1].cells[5].text = String(serial); },
    },
    docs: { exportMarkdown: async (id) => mdOf(`Article de test numéro ${Number(id.slice(3, 5))}`) },
    repo: {
      existing: async () => ({ all: committed.map((e) => ({ slug: e.slug, docId: e.source.docId, row: e.source.sheetRow, updatedAt: e.updatedAt })), auto: committed, targets: {}, reserved: [], pages: ['index'] }),
      write: async ({ auto }) => { pending = auto; },
      images: async () => {},
      check: async () => ({ ok: true }),
      commit: async () => { events.push('commit'); committed = pending; },
      reset: async () => {},
      push: async () => {},
    },
    site: { verify: async () => ({ ok: true }) },
  };
  return { events, grid, deps, articles: () => committed };
}
const passage = (w, today) => runPublication({ deps: w.deps, today, log: () => {} });

test('4 passages le même jour : un seul article, le premier « à intégrer » du Sheet', async () => {
  const w = monde(6);
  const r = [];
  for (let i = 0; i < 4; i++) r.push(await passage(w, '2026-11-17'));
  assert.equal(r[0].results[0].outcome, 'publié');
  for (const x of r.slice(1)) assert.equal(x.results.length, 0, 'les passages suivants ne font rien');
  assert.equal(w.articles().length, 1);
  assert.equal(w.events.filter((e) => e === 'commit').length, 1);
  assert.equal(w.grid[1].cells[4].text, 'Publié');
  assert.equal(w.grid[1].cells[5].text, String(sheetSerial('2026-11-17')));
  for (let row = 3; row <= 7; row++) assert.equal(w.grid[row - 1].cells[4].text, 'à intégrer');
});
test('une semaine ouvrée avec 4 passages par jour : 5 articles, dans l’ordre, jamais deux le même jour', async () => {
  const w = monde(8);
  for (const jour of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']) for (let i = 0; i < 4; i++) await passage(w, jour);
  assert.deepEqual(w.articles().map((a) => a.source.sheetRow), [2, 3, 4, 5, 6]);
  assert.deepEqual(w.articles().map((a) => a.updatedAt), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']);
});
test('journée manquée (aucun passage) : le lendemain publie UN seul article, pas deux', async () => {
  const w = monde(5);
  await passage(w, '2026-11-16');
  // 17/11 : aucun passage ; 18/11 : reprise normale
  for (let i = 0; i < 4; i++) await passage(w, '2026-11-18');
  assert.deepEqual(w.articles().map((a) => a.source.sheetRow), [2, 3]);
  assert.equal(w.grid[2].cells[4].text, 'Publié');                                        // ligne 3
  assert.equal(w.grid[2].cells[5].text, String(sheetSerial('2026-11-18')));
  assert.equal(w.grid[3].cells[4].text, 'à intégrer');                                    // ligne 4 : pas de rattrapage
});
test('passage retardé jusqu’après minuit : daté du jour de la garde, le passage suivant du même jour ne publie rien', async () => {
  const w = monde(4);
  await passage(w, resolveToday({ PUBLISH_TODAY: '2026-11-19' }, new Date('2026-11-20T00:20:00+01:00'))); // fini après minuit, mais « du jeudi »
  assert.equal(w.articles()[0].updatedAt, '2026-11-19');
  const suite = await passage(w, '2026-11-19');
  assert.equal(suite.results.length, 0);
  assert.equal(w.articles().length, 1);
});
