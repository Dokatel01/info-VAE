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
  assert.match(body, /top:\s*var\(--sticky-offset(?:,\s*24px)?\)/);
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

test('accueil : sticky actif au-dessus de 768 px, désactivé seulement en une seule colonne (mobile)', () => {
  const css = read('how-it-works.css');
  const media = css.match(/@media \(max-width:\s*768px\)\s*\{([\s\S]*)\}\s*$/);
  assert.ok(media, 'media query 768 px introuvable');
  assert.match(media[1], /\.how-it-works__sticky\s*\{[^}]*position:\s*static/);
});

// ---- Pages d'articles (colonne latérale : carte conseillers + plan de l'article) ----
test('page article : le bloc latéral est sticky, la colonne s\'étire, aucun overflow parent', () => {
  const css = read('article-page.css');
  const sticky = rule(css, '.article-page__sticky');
  assert.match(sticky, /position:\s*sticky/);
  assert.match(sticky, /top:\s*var\(--sticky-offset(?:,\s*24px)?\)/);
  // sans align-self: stretch, la colonne a la hauteur de son contenu et le sticky ne peut pas se déplacer
  assert.match(rule(css, '.article-page__side'), /align-self:\s*stretch/);
  for (const sel of ['.article-page', '.article-page__grid', '.article-page__side']) {
    assert.doesNotMatch(rule(css, sel), /overflow/, `${sel} ne doit pas avoir d'overflow`);
  }
});

test('page article : sticky désactivé seulement en une seule colonne (≤ 768 px)', () => {
  const css = read('article-page.css');
  const media = css.match(/@media \(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(media, 'media query 768 px introuvable');
  assert.match(media[1], /\.article-page__sticky\s*\{[^}]*position:\s*static/);
});

test('page article : la carte conseillers est bien dans le bloc sticky', () => {
  const src = fs.readFileSync(new URL('../src/pages/[slug].astro', import.meta.url), 'utf8');
  assert.match(src, /article-page__sticky[\s\S]*<AdvisorCard/);
});

// ---- Cartes d'articles : plus de bouton « Plus d'infos », « Voir plus » = vrai lien, carte entièrement cliquable ----
test('carte d\'article : « Voir plus » est un vrai lien, un seul lien par carte, pas de « Plus d\'infos »', () => {
  const src = fs.readFileSync(new URL('../src/components/ArticleCard.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /Plus d.infos/);
  assert.equal((src.match(/<a\s/g) || []).length, 1, 'une seule balise <a> par carte');
  assert.match(src, /<a class="article-card__button[^>]*href=\{href\}[^>]*>Voir plus<\/a>/);
  const css = read('article-card.css');
  assert.match(css, /\.article-card__button::after\s*\{[^}]*inset:\s*0/);
  assert.match(rule(css, '.article-card'), /position:\s*relative/);
});

// ---- Fiabilité : le sticky ne doit pas dépendre de la hauteur ni d'un zoom courant ----
test('le sticky n\'est jamais retiré selon la hauteur de l\'écran (max-height) ni avant 768 px de large', () => {
  for (const file of ['article-page.css', 'how-it-works.css']) {
    const css = read(file);
    assert.doesNotMatch(css, /@media[^{]*max-height/, `${file} : pas de media query sur la hauteur`);
    assert.doesNotMatch(css, /@media[^{]*max-width:\s*(?:8\d\d|9\d\d)px/, `${file} : le sticky doit rester actif jusqu'à 769 px`);
  }
});

test('même seuil « une seule colonne » sur l\'accueil et les articles', () => {
  const seuil = (file) => read(file).match(/@media \(max-width:\s*(\d+)px\)/)[1];
  assert.equal(seuil('how-it-works.css'), seuil('article-page.css'));
});

test('page article : le bloc sticky est limité à la hauteur visible, seul le plan défile', () => {
  const css = read('article-page.css');
  const sticky = rule(css, '.article-page__sticky');
  assert.match(sticky, /max-height:\s*calc\(100(?:d)?vh\s*-/, 'hauteur limitée à l\'écran');
  assert.match(sticky, /var\(--sticky-offset,\s*24px\)/, 'valeur de repli si la variable manque');
  assert.match(rule(css, '.article-page__sticky > .article-toc'), /overflow-y:\s*auto/);
  assert.match(rule(css, '.article-page__sticky > .advisor-card'), /flex:\s*none/);
});
