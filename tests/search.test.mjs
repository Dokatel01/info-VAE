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
  assert.deepEqual(slugsFor('eligibilite'), ['qui-peut-faire-une-vae']);
});

test('recherche par résumé et par contenu (avec extrait)', () => {
  assert.ok(slugsFor('options de financement').includes('combien-coute-la-vae')); // résumé
  const results = searchArticles(index, 'OPCO');
  assert.deepEqual(results.map((r) => r.article.slug), ['combien-coute-la-vae']);
  assert.match(results[0].snippet, /OPCO/);
});

test('début de mot et plusieurs mots (tous requis)', () => {
  assert.ok(slugsFor('financ').includes('aides-financieres-vae'));
  // « cpf » et « pôle » sont aussi dans le texte de l'article sur les coûts : il remonte, mais après
  assert.deepEqual(slugsFor('cpf pole'), ['aides-financieres-vae', 'combien-coute-la-vae']);
  assert.deepEqual(slugsFor('cpf zzzz'), []);
});

test('le titre passe avant le contenu', () => {
  const results = searchArticles(index, 'financ');
  assert.equal(results[0].article.slug, 'aides-financieres-vae'); // dans son titre ET ses catégories
});

test('aucun résultat / requête vide', () => {
  assert.deepEqual(searchArticles(index, 'xylophone'), []);
  assert.deepEqual(searchArticles(index, ''), []);
  assert.deepEqual(searchArticles(index, '   '), []);
  assert.deepEqual(searchArticles(index, '!!!'), []);
});
