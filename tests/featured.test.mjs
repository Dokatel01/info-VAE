// Articles en vedette : tirage aléatoire de 3 articles distincts parmi tous les articles du site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { allCards, defaultFeaturedSlugs, featuredArticles } from '../src/data/featuredArticles.js';
import { articles, articleUrl } from '../src/data/articles.js';

const component = fs.readFileSync(new URL('../src/components/FeaturedArticles.astro', import.meta.url), 'utf8');
const script = component.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

test('toutes les cartes viennent des articles du site, avec le bon lien', () => {
  assert.equal(allCards.length, articles.length);
  for (const [i, card] of allCards.entries()) {
    assert.equal(card.href, articleUrl(articles[i]));
    assert.match(card.href, /^\/[a-z0-9-]+$/);
  }
  assert.equal(new Set(allCards.map((c) => c.slug)).size, allCards.length, 'pas de doublon');
  assert.equal(featuredArticles.length, 3);
  assert.deepEqual(featuredArticles.map((c) => c.slug), defaultFeaturedSlugs);
});

// Mini DOM : une grille avec N éléments, exécution réelle du script de la page.
function run(n, randomValues) {
  let calls = 0;
  const items = Array.from({ length: n }, (_, i) => ({ id: i, hidden: i >= 3 }));
  const grid = {
    children: items.slice(),
    getAttribute: () => '3',
    appendChild(item) { this.children = this.children.filter((x) => x !== item).concat(item); },
  };
  const win = {
    crypto: { getRandomValues: (a) => { a[0] = randomValues(calls++); return a; } },
  };
  vm.runInNewContext(script, { document: { querySelector: () => grid }, window: win, Uint32Array, Number, Math, Array });
  return grid.children;
}

test('le script affiche exactement 3 articles distincts et masque les autres', () => {
  for (let t = 0; t < 200; t++) {
    const order = run(10, () => Math.floor(Math.random() * 2 ** 32));
    const visible = order.filter((x) => !x.hidden).map((x) => x.id);
    assert.equal(visible.length, 3);
    assert.equal(new Set(visible).size, 3, 'pas de doublon dans la sélection');
    assert.equal(order.length, 10);
    assert.equal(new Set(order.map((x) => x.id)).size, 10);
  }
});

test('le tirage change d\'une visite à l\'autre et tous les articles peuvent sortir', () => {
  const seen = new Set(); const selections = new Set();
  for (let t = 0; t < 300; t++) {
    const vis = run(10, () => Math.floor(Math.random() * 2 ** 32)).filter((x) => !x.hidden).map((x) => x.id);
    vis.forEach((v) => seen.add(v)); selections.add(vis.join(','));
  }
  assert.equal(seen.size, 10, 'chaque article peut être tiré');
  assert.ok(selections.size > 20, 'la sélection varie');
});

test('moins de 3 articles : on les affiche tous, sans erreur', () => {
  const order = run(2, () => 1);
  assert.equal(order.filter((x) => !x.hidden).length, 2);
});

test('le composant : cartes masquées au départ sauf les 3 par défaut (repli sans JS)', () => {
  assert.match(component, /hidden=\{index >= 3\}/);
  assert.match(component, /<ArticleCard \{\.\.\.card\} \/>/);
});
