// Tests du questionnaire « Suis-je éligible ? » et de la transmission des paramètres de suivi.
// Lancer : node --test tests/quiz.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withTrackingParams, trackingFromSearch } from '../src/lib/trackingParams.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const PAGE = 'https://info-vae.fr/?utm_source=facebook&utm_medium=social&utm_campaign=vae';
const T = trackingFromSearch('?utm_source=facebook&utm_medium=social&utm_campaign=vae&fbclid=ABC&autre=1');

test('les paramètres de suivi sont relevés (UTM + identifiants de clic), les autres ignorés', () => {
  assert.deepEqual(T, { utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'vae', fbclid: 'ABC' });
  assert.deepEqual(trackingFromSearch('?utm_source=&utm_medium=%20'), {});
});

test('lien interne : les paramètres sont ajoutés', () => {
  assert.equal(withTrackingParams('/test-eligibilite-vae/', T, PAGE), '/test-eligibilite-vae/?utm_source=facebook&utm_medium=social&utm_campaign=vae&fbclid=ABC');
});

test('un paramètre déjà présent n’est pas écrasé, et il n’y a aucun doublon', () => {
  const out = withTrackingParams('/test-eligibilite-vae/?utm_source=newsletter&x=1', T, PAGE);
  assert.equal(out, '/test-eligibilite-vae/?utm_source=newsletter&x=1&utm_medium=social&utm_campaign=vae&fbclid=ABC');
  assert.equal(withTrackingParams(out, T, PAGE), out, 'idempotent');
  assert.equal((out.match(/utm_source=/g) || []).length, 1);
});

test('les autres paramètres et l’ancre sont conservés', () => {
  assert.equal(withTrackingParams('/article?q=a%20b#plan', { utm_source: 'x' }, PAGE), '/article?q=a%20b&utm_source=x#plan');
  assert.equal(withTrackingParams('/article#plan', { utm_source: 'x' }, PAGE), '/article?utm_source=x#plan');
});

test('liens non concernés : externes, mailto, tel, ancre seule, fichiers', () => {
  for (const href of ['https://exemple.com/page', 'mailto:contact@info-vae.fr', 'tel:0891033018', '#article', '/images/articles/a.svg', '/search-index.json', 'javascript:void(0)', '']) {
    assert.equal(withTrackingParams(href, T, PAGE), href, href);
  }
  assert.equal(withTrackingParams('https://info-vae.fr/test-eligibilite-vae/', { utm_source: 'x' }, PAGE), 'https://info-vae.fr/test-eligibilite-vae/?utm_source=x', 'lien absolu du même site');
  assert.equal(withTrackingParams('/page.html', { utm_source: 'x' }, PAGE), '/page.html?utm_source=x');
});

test('sans paramètre à transmettre, rien ne change', () => {
  assert.equal(withTrackingParams('/test-eligibilite-vae/', {}, PAGE), '/test-eligibilite-vae/');
});

test('le bouton « Suis-je éligible ? » mène au questionnaire', () => {
  assert.match(read('src/components/Hero.astro'), /<a class="btn btn--accent" href="\/test-eligibilite-vae\/">Suis-je éligible \?<\/a>/);
});

test('le questionnaire intégré est identique à celui fourni (étapes, champs, valeurs, textes)', () => {
  const given = process.env.QUIZ_REFERENCE;
  if (!given || !fs.existsSync(given)) return; // fichier d'origine fourni par Info VAE : comparaison faite si son chemin est donné
  const orig = fs.readFileSync(given, 'utf8');
  const form = orig.slice(orig.indexOf('<form class="vq"'), orig.indexOf('</form>') + 7);
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  assert.ok(norm(read('src/pages/test-eligibilite-vae.astro')).includes(norm(form)), 'le formulaire est repris à l’identique');
  const js = orig.match(/<script>\n([\s\S]*?)<\/script>/)[1];
  assert.ok(read('src/scripts/quiz.js').endsWith(js), 'le script est repris à l’identique');
});

test('la page /test-eligibilite-vae/ contient bien toutes les étapes du questionnaire', () => {
  const page = read('src/pages/test-eligibilite-vae.astro');
  for (const step of ['statut', 'activite', 'experience', 'domaine', 'niveau', 'financement', 'delai', 'mode', 'coordonnees']) assert.match(page, new RegExp(`data-step="${step}"`), step);
  assert.match(page, /name="quiz-vae"/);
  assert.match(read('src/layouts/BaseLayout.astro'), /track-links\.js/);
});
