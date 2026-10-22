// Illustrations des articles : une image par article, pertinente, unique, à jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { articles, articleUrl } from '../src/data/articles.js';
import { generatedImages } from '../src/data/images.js';
import { renderIllustration, pickMotifs, MOTIF_NAMES, WIDTH, HEIGHT } from '../src/lib/illustration.js';
import { findStale, articleText } from '../scripts/generate-images.mjs';

const file = (slug) => new URL(`../public/images/articles/${slug}.svg`, import.meta.url);

test('chaque article a une illustration à jour (sinon : lancer `npm run images`)', () => {
  const stale = findStale(articles, generatedImages).map((a) => a.slug);
  assert.deepEqual(stale, [], `articles sans illustration à jour : ${stale.join(', ')} → npm run images`);
});

test('chaque article utilise SA photo (si elle existe) ou SON illustration, enregistrée dans le projet', () => {
  for (const article of articles) {
    assert.ok(fs.existsSync(file(article.slug)), `illustration de secours manquante pour ${article.slug}`);
    if (article.imageSrcset) assert.match(article.image, new RegExp(`^/images/photos/${article.slug}-712\\.webp$`));
    else assert.equal(article.image, `/images/articles/${article.slug}.svg`);
  }
});

test('aucune image partagée entre deux articles', () => {
  const hashes = articles.map((a) => crypto.createHash('sha1').update(fs.readFileSync(file(a.slug))).digest('hex'));
  assert.equal(new Set(hashes).size, articles.length);
  assert.equal(new Set(articles.map((a) => a.image)).size, articles.length);
});

test('images propres : format 712×384, légères, sans script ni lien externe', () => {
  for (const article of articles) {
    const svg = fs.readFileSync(file(article.slug), 'utf8');
    assert.ok(svg.startsWith('<svg'), article.slug);
    assert.ok(svg.includes(`viewBox="0 0 ${WIDTH} ${HEIGHT}"`));
    assert.ok(Buffer.byteLength(svg) < 12 * 1024, `${article.slug} trop lourde`);
    assert.doesNotMatch(svg, /<script|<image|href=|onload|NaN|undefined/);
    assert.doesNotMatch(svg.replace('xmlns="http://www.w3.org/2000/svg"', ''), /https?:/);
  }
});

test('le registre correspond aux fichiers (sujet principal enregistré)', () => {
  for (const article of articles) {
    const entry = generatedImages[article.slug];
    assert.ok(MOTIF_NAMES.includes(entry.motif));
    const again = renderIllustration({ slug: article.slug, title: article.title, categories: article.categories, text: articleText(article) });
    assert.equal(fs.readFileSync(file(article.slug), 'utf8'), again.svg, 'dessin déterministe');
  }
});

test('pertinence : le sujet dessiné correspond au sujet de l\'article', () => {
  const expect = {
    'le-cpf-pour-financer-la-vae-ce-qu-il-faut-savoir': 'card',
    'est-ce-que-pole-emploi-finance-la-vae-ce-qu-il-faut-savoir': 'card',
    'combien-coute-la-vae': 'money',
    'comment-obtenir-le-diplome-d-etat-d-aide-soignant-deas-par-la-vae': 'care',
    'comment-choisir-son-organisme-accompagnateur-vae': 'advisor',
    'peut-on-faire-une-vae-a-distance': 'laptop',
    'une-assistante-maternelle-peut-elle-devenir-auxiliaire-de-puericulture-par-la-vae': 'child',
    'qui-peut-faire-une-vae': 'people',
  };
  for (const [slug, motif] of Object.entries(expect)) assert.equal(generatedImages[slug].motif, motif, slug);
});

test('futurs articles : sujet détecté, image différente, aucun plantage même sans catégorie', () => {
  const sample = [
    { slug: 'preparer-le-jury-vae', title: 'Comment se préparer au jury de la VAE', categories: [], text: '' },
    { slug: 'duree-vae', title: 'Combien de temps dure une VAE', categories: ['Etapes VAE'], text: '' },
    { slug: 'educateur', title: 'Devenir éducateur', categories: ['Educateur spécialisé'], text: '' },
    { slug: 'sujet-inconnu', title: 'Zzz', categories: [], text: '' },
  ];
  assert.equal(pickMotifs(sample[0]).primary, 'jury');
  assert.equal(pickMotifs(sample[1]).primary, 'time');
  assert.equal(pickMotifs(sample[2]).primary, 'people');
  assert.equal(pickMotifs(sample[3]).primary, 'book', 'repli neutre pour un sujet inconnu');
  const svgs = sample.map((s) => renderIllustration(s).svg);
  assert.equal(new Set(svgs).size, svgs.length);
});

test('tous les sujets se dessinent correctement', () => {
  for (const motif of MOTIF_NAMES) {
    const { svg } = renderIllustration({ slug: `test-${motif}`, title: 'x', categories: [], text: '' });
    assert.ok(svg.length > 500);
  }
});
