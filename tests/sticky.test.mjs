// Garde-fou « carte conseillers sticky » : lancer avec `npm test`.
// Ces tests lisent les fichiers CSS (ils ne remplacent pas un essai dans le navigateur) et
// échouent si quelqu'un supprime le sticky ou ajoute un `overflow` sur un parent de la carte.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../src/styles/${f}`, import.meta.url), 'utf8');
const rule = (css, selector) => {
  const m = css.match(new RegExp(`(^|\\})\\s*${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'm'));
  return m ? m[2] : '';
};

test('carte conseillers : position sticky avec un décalage haut défini', () => {
  const css = read('how-it-works.css');
  const body = rule(css, '.how-it-works__sticky');
  assert.match(body, /position:\s*sticky/);
  assert.match(body, /top:\s*var\(--sticky-offset\)/);
  assert.match(read('variables.css'), /--sticky-gap:\s*\d+px/);
  assert.match(read('variables.css'), /--sticky-offset:\s*var\(--sticky-gap\)/);
});

test('carte conseillers : la colonne parente occupe toute la hauteur de la ligne (align-items: stretch)', () => {
  const body = rule(read('how-it-works.css'), '.how-it-works__grid');
  assert.match(body, /align-items:\s*stretch/);
});

test('aucun overflow sur html, body, main, la section ou la grille de la section', () => {
  for (const [file, selector] of [
    ['base.css', 'html'], ['base.css', 'body'], ['base.css', '.site-main'], ['base.css', '.container'],
    ['how-it-works.css', '.how-it-works'], ['how-it-works.css', '.how-it-works__grid'],
  ]) {
    assert.doesNotMatch(rule(read(file), selector), /overflow/, `${selector} (${file}) ne doit pas avoir d'overflow`);
  }
});

test('sticky actif au-dessus de 900 px, désactivé volontairement en dessous (une seule colonne)', () => {
  const css = read('how-it-works.css');
  const media = css.match(/@media \(max-width:\s*900px\)\s*\{([\s\S]*)\}\s*$/);
  assert.ok(media, 'media query 900 px introuvable');
  assert.match(media[1], /\.how-it-works__sticky\s*\{[^}]*position:\s*static/);
});

// ---- Pages d'articles (colonne latérale : carte conseillers + plan de l'article) ----
test('page article : le bloc latéral est sticky, la colonne s\'étire, aucun overflow parent', () => {
  const css = read('article-page.css');
  const sticky = rule(css, '.article-page__sticky');
  assert.match(sticky, /position:\s*sticky/);
  assert.match(sticky, /top:\s*var\(--sticky-offset\)/);
  // sans align-self: stretch, la colonne a la hauteur de son contenu et le sticky ne peut pas se déplacer
  assert.match(rule(css, '.article-page__side'), /align-self:\s*stretch/);
  for (const sel of ['.article-page', '.article-page__grid', '.article-page__side']) {
    assert.doesNotMatch(rule(css, sel), /overflow/, `${sel} ne doit pas avoir d'overflow`);
  }
});

test('page article : sticky désactivé en une seule colonne (≤ 900 px)', () => {
  const css = read('article-page.css');
  const media = css.match(/@media \(max-width:\s*900px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(media, 'media query 900 px introuvable');
  assert.match(media[1], /\.article-page__sticky\s*\{[^}]*position:\s*static/);
});

test('page article : la carte conseillers est bien dans le bloc sticky', () => {
  const src = fs.readFileSync(new URL('../src/pages/[slug].astro', import.meta.url), 'utf8');
  assert.match(src, /article-page__sticky[\s\S]*<AdvisorCard/);
});

// ---- Cartes d'articles : plus de bouton « Plus d'infos », carte entièrement cliquable ----
test('carte d\'article : pas de « Plus d\'infos », un seul lien (pas de liens imbriqués)', () => {
  const src = fs.readFileSync(new URL('../src/components/ArticleCard.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Plus d.infos/);
  assert.equal((src.match(/<a\s/g) || []).length, 1, 'une seule balise <a> par carte');
  assert.match(src, /<h3[^>]*>\s*<a class="article-card__link"/);
  const css = read('article-card.css');
  assert.match(css, /\.article-card__link::after\s*\{[^}]*inset:\s*0/);
  assert.match(rule(css, '.article-card'), /position:\s*relative/);
});
