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
