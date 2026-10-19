// Contrôle des données d'articles : lancer avec `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { articles, reservedSlugs, getToc, getRelated, getArticle } from '../src/data/articles.js';
import { featuredArticles } from '../src/data/featuredArticles.js';
import { slugify, formatDate, inlineToHtml } from '../src/lib/text.js';

test('chaque article a les champs obligatoires', () => {
  for (const a of articles) {
    for (const field of ['slug', 'title', 'excerpt', 'summary', 'updatedAt', 'author', 'image']) {
      assert.ok(a[field], `${a.slug ?? '?'} : champ « ${field} » manquant`);
    }
    assert.ok(Array.isArray(a.content) && a.content.length > 0, `${a.slug} : contenu vide`);
    assert.match(a.updatedAt, /^\d{4}-\d{2}-\d{2}$/, `${a.slug} : date au format AAAA-MM-JJ`);
  }
});

test('adresses (slugs) : uniques, propres, non réservées', () => {
  const slugs = articles.map((a) => a.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'slugs en double');
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `slug non propre : ${slug}`);
    assert.ok(!reservedSlugs.includes(slug), `slug réservé : ${slug}`);
  }
});

test('catégories : liste non vide, texte exact, sans doublon ni valeur vide', () => {
  for (const a of articles) {
    assert.ok(Array.isArray(a.categories) && a.categories.length > 0, `${a.slug} : au moins une catégorie`);
    assert.equal(new Set(a.categories).size, a.categories.length, `${a.slug} : catégorie en double`);
    for (const c of a.categories) {
      assert.equal(typeof c, 'string');
      assert.equal(c, c.trim(), `${a.slug} : espaces autour de « ${c} »`);
      assert.ok(c.length > 0);
    }
  }
});

test("les cartes de l'accueil reprennent exactement les catégories des articles", () => {
  assert.equal(featuredArticles.length, 3);
  for (const card of featuredArticles) {
    const article = articles.find((a) => `/${a.slug}` === card.href);
    assert.ok(article, `carte sans article : ${card.href}`);
    assert.deepEqual(card.tags, article.categories);
    assert.equal(card.title, article.cardTitle ?? article.title);
  }
});

test('sommaire : un identifiant unique par titre de niveau 2', () => {
  for (const a of articles) {
    const toc = getToc(a);
    assert.equal(toc.length, a.content.filter((b) => b.type === 'h2').length);
    assert.equal(new Set(toc.map((t) => t.id)).size, toc.length, `${a.slug} : ancres en double`);
  }
  assert.deepEqual(
    getToc(getArticle('combien-coute-la-vae')).map((t) => t.text),
    ["Les différents coûts d'une VAE", 'Comment financer sa VAE ?', 'Optimiser son budget pour une VAE'],
  );
});

test('articles liés : existent, ne contiennent pas l’article lui-même, 3 au maximum', () => {
  for (const a of articles) {
    const related = getRelated(a);
    assert.ok(related.length <= 3);
    assert.ok(!related.some((r) => r.slug === a.slug));
  }
});

test('utilitaires de texte', () => {
  assert.equal(slugify('Comment financer sa VAE ?'), 'comment-financer-sa-vae');
  assert.equal(slugify("Les différents coûts d'une VAE"), 'les-differents-couts-d-une-vae');
  assert.equal(formatDate('2026-10-14'), '14/10/2026');
  assert.equal(inlineToHtml('a **b** <i>'), 'a <strong>b</strong> &lt;i&gt;');
  assert.equal(inlineToHtml('x\ny'), 'x<br>y');
});

// ---------------------------------------------------------------------------
// Articles issus du Google Sheets (src/data/sheetArticles.js)
// ---------------------------------------------------------------------------
import { sheetArticles } from '../src/data/sheetArticles.js';
import { officialCategories, parseSheetCategories } from '../src/data/categories.js';

test('catégories officielles : les 8 libellés du Sheet, orthographe exacte', () => {
  assert.deepEqual(officialCategories, [
    'Tarif', 'Pour qui', 'Financement', 'Etapes VAE',
    'Auxiliaire Puériculture', 'Aide soignant', 'VAE général', 'Educateur spécialisé',
  ]);
});

test('catégories multiples du Sheet → liste, texte inchangé', () => {
  assert.deepEqual(parseSheetCategories('Pour qui, Auxiliaire Puériculture'), ['Pour qui', 'Auxiliaire Puériculture']);
  assert.deepEqual(parseSheetCategories('Financement, Tarif'), ['Financement', 'Tarif']);
  assert.deepEqual(parseSheetCategories('Etapes VAE'), ['Etapes VAE']);
  assert.deepEqual(parseSheetCategories(''), []);
});

test('articles du Sheet : uniquement des catégories officielles, titres sans espace superflu', () => {
  assert.equal(sheetArticles.length, 7);
  for (const a of sheetArticles) {
    for (const c of a.categories) assert.ok(officialCategories.includes(c), `${a.slug} : catégorie non officielle « ${c} »`);
    assert.equal(a.title, a.title.trim());
    assert.ok(a.source?.sheetRow && a.source?.docId, `${a.slug} : traçabilité Sheet/Doc manquante`);
    assert.ok(articles.some((x) => x.slug === a.slug), `${a.slug} : absent de la liste d'articles du site`);
  }
});

test('articles du Sheet : catégories attendues ligne par ligne (relevé du 19/10/2026)', () => {
  const byRow = Object.fromEntries(sheetArticles.map((a) => [a.source.sheetRow, a.categories]));
  assert.deepEqual(byRow, {
    8: ['Pour qui', 'Auxiliaire Puériculture'],
    9: ['Financement', 'Tarif'],
    10: ['Financement', 'Tarif'],
    11: ['Aide soignant'],
    12: ['Etapes VAE'],
    13: ['Etapes VAE'],
    14: ['Auxiliaire Puériculture'],
  });
});

test('articles du Sheet : contenu complet, aucune fin de texte coupée', () => {
  for (const a of sheetArticles) {
    const last = a.content[a.content.length - 1];
    assert.ok(/[.!?»)]$/.test(last.text.trim()), `${a.slug} : dernier bloc non terminé`);
    assert.ok(a.content.filter((b) => b.type === 'h2').length >= 2, `${a.slug} : au moins 2 sections`);
  }
});
