// Contrôle de la recherche sur les vrais articles : lancer avec `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { articles, articleUrl } from '../src/data/articles.js';
import { GET } from '../src/pages/search-index.json.js';
import { searchArticles, normalize, tokenize } from '../src/lib/search.js';

const index = await GET().json();
const slugsFor = (query) => searchArticles(index, query).map((r) => r.article.slug);

test("l'index contient tous les articles, avec leurs catégories exactes", () => {
  assert.equal(index.length, articles.length);
  for (const entry of index) {
    const source = articles.find((a) => a.slug === entry.slug);
    assert.deepEqual(entry.categories, source.categories);
    assert.equal(entry.url, articleUrl(source));
    assert.ok(entry.content.length > 20);
    assert.ok(!entry.content.includes('**'), 'le gras ne doit pas rester dans l’index');
  }
});

test('normalisation : accents, majuscules et apostrophes', () => {
  assert.equal(normalize('  Pôle   Emploi '), 'pole emploi');
  assert.deepEqual(tokenize("Pôle emploi, l'AIF"), ['pole', 'emploi', 'l', 'aif']);
});

test('recherche par titre (avec ou sans accents)', () => {
  assert.deepEqual(slugsFor('Combien coûte'), ['combien-coute-la-vae']);
  assert.deepEqual(slugsFor('combien coute'), ['combien-coute-la-vae']);
});

test('recherche par catégorie', () => {
  assert.deepEqual(slugsFor('CPF')[0], 'aides-financieres-vae'); // catégorie de l'article « aides »
  assert.ok(slugsFor('budget').includes('combien-coute-la-vae'));
  assert.equal(slugsFor('eligibilite')[0], 'qui-peut-faire-une-vae'); // catégorie « Eligibilité » (provisoire) : en premier
  assert.ok(slugsFor('Aide soignant').includes('comment-obtenir-le-diplome-d-etat-d-aide-soignant-deas-par-la-vae')); // catégorie officielle du Sheet
  assert.ok(slugsFor('Etapes VAE').includes('comment-choisir-son-organisme-accompagnateur-vae'));
});

test('recherche par résumé et par contenu (avec extrait)', () => {
  assert.ok(slugsFor('options de financement').includes('combien-coute-la-vae')); // résumé
  const results = searchArticles(index, 'OPCO');
  const hit = results.find((r) => r.article.slug === 'combien-coute-la-vae');
  assert.ok(hit, 'OPCO doit retrouver l\'article sur les coûts');
  assert.match(hit.snippet, /OPCO/);
  for (const r of results) assert.match(r.snippet, /OPCO/i); // chaque résultat montre le mot trouvé
});

test('début de mot et plusieurs mots (tous requis)', () => {
  assert.ok(slugsFor('financ').includes('aides-financieres-vae'));
  // « cpf » et « pôle » sont aussi dans le texte de l'article sur les coûts : il remonte, mais après
  const cpfPole = slugsFor('cpf pole');
  assert.equal(cpfPole[0], 'aides-financieres-vae');
  assert.ok(cpfPole.includes('combien-coute-la-vae'));
  assert.deepEqual(slugsFor('cpf zzzz'), []);
});

test('le titre passe avant le contenu', () => {
  const results = searchArticles(index, 'financ');
  assert.match(results[0].article.title, /financ/i); // le premier résultat a « financ » dans son titre
});

test('aucun résultat / requête vide', () => {
  assert.deepEqual(searchArticles(index, 'xylophone'), []);
  assert.deepEqual(searchArticles(index, ''), []);
  assert.deepEqual(searchArticles(index, '   '), []);
  assert.deepEqual(searchArticles(index, '!!!'), []);
});
