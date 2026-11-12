// Garde horaire du workflow de publication : exécute VRAIMENT le script de l'étape « Garde horaire »
// (extrait de .github/workflows/publish-articles.yml) avec une horloge simulée. Lancer :
//   node --test tests/garde-horaire.test.mjs
// (volontairement hors de « npm test » : on ne touche pas au script de test de l'automatisation).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const yml = fs.readFileSync(path.join(root, '.github/workflows/publish-articles.yml'), 'utf8');

const step = yml.split('\n      - ').find((s) => s.startsWith('name: Garde horaire'));
assert.ok(step, 'étape « Garde horaire » introuvable');
const script = step.split('run: |\n')[1].split('\n').map((l) => l.replace(/^ {10}/, '')).join('\n');

function lancer(utc, event = 'schedule') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garde-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'date'), '#!/bin/bash\nexec /usr/bin/date -d "$FAKE_UTC" "$@"\n', { mode: 0o755 });
  const out = path.join(dir, 'out');
  fs.writeFileSync(out, '');
  const body = script.replaceAll('${{ github.event_name }}', event);
  const log = execFileSync('bash', ['-e', '-c', body], {
    env: { PATH: `${bin}:/usr/bin:/bin`, FAKE_UTC: utc, GITHUB_OUTPUT: out },
    encoding: 'utf8',
  });
  const res = fs.readFileSync(out, 'utf8').trim();
  fs.rmSync(dir, { recursive: true, force: true });
  return { res, log };
}

// Hiver (UTC+1) : 18 h Paris = 17 h UTC
test('hiver : 16 h UTC (17 h Paris) ignoré, 17 h UTC (18 h Paris) passe', () => {
  assert.equal(lancer('2026-11-10 16:00:00 UTC').res, 'lancer=non');
  assert.equal(lancer('2026-11-10 17:00:00 UTC').res, 'lancer=oui');
});
test('hiver : le retard constaté les 10 et 11 novembre (22 h 04 UTC = 23 h 04 Paris) passe désormais', () => {
  assert.equal(lancer('2026-11-10 22:04:00 UTC').res, 'lancer=oui');
  assert.equal(lancer('2026-11-10 21:40:00 UTC').res, 'lancer=oui');
});
test('hiver : 23 h 59 Paris passe, minuit Paris et la matinée ne passent pas', () => {
  assert.equal(lancer('2026-11-10 22:59:59 UTC').res, 'lancer=oui');
  assert.equal(lancer('2026-11-10 23:00:00 UTC').res, 'lancer=non'); // 00 h 00 Paris
  assert.equal(lancer('2026-11-11 07:00:00 UTC').res, 'lancer=non'); // 08 h 00 Paris (octal : « 08 »)
  assert.equal(lancer('2026-11-11 08:00:00 UTC').res, 'lancer=non'); // 09 h 00 Paris (octal : « 09 »)
});
// Été (UTC+2) : 18 h Paris = 16 h UTC
test('été : 16 h UTC (18 h Paris) passe, 15 h UTC (17 h Paris) ignoré, 21 h UTC (23 h Paris) passe, 22 h UTC (minuit) ignoré', () => {
  assert.equal(lancer('2026-07-10 15:00:00 UTC').res, 'lancer=non');
  assert.equal(lancer('2026-07-10 16:00:00 UTC').res, 'lancer=oui');
  assert.equal(lancer('2026-07-10 21:59:59 UTC').res, 'lancer=oui');
  assert.equal(lancer('2026-07-10 22:00:00 UTC').res, 'lancer=non');
});
test('changements d’heure : le fuseau Europe/Paris est respecté (dimanche 25 oct. 2026 et 29 mars 2026)', () => {
  assert.equal(lancer('2026-10-23 16:00:00 UTC').res, 'lancer=oui'); // vendredi, encore l’été : 18 h Paris
  assert.equal(lancer('2026-10-26 16:00:00 UTC').res, 'lancer=non'); // lundi, l’hiver : 17 h Paris
  assert.equal(lancer('2026-10-26 17:00:00 UTC').res, 'lancer=oui'); // 18 h Paris
  assert.equal(lancer('2026-03-27 17:00:00 UTC').res, 'lancer=oui'); // vendredi, encore l’hiver : 18 h Paris
  assert.equal(lancer('2026-03-30 16:00:00 UTC').res, 'lancer=oui'); // lundi, l’été : 18 h Paris
  assert.equal(lancer('2026-03-30 15:00:00 UTC').res, 'lancer=non'); // 17 h Paris
});
test('les déclenchements manuels (workflow_dispatch) et push ne sont jamais bloqués par l’horaire', () => {
  assert.equal(lancer('2026-11-10 09:00:00 UTC', 'workflow_dispatch').res, 'lancer=oui');
  assert.equal(lancer('2026-11-10 09:00:00 UTC', 'push').res, 'lancer=oui');
});
