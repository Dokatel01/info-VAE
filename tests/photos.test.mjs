// Contrôle des photos d'articles : lancer avec `npm test`.
// Tant qu'aucune photo n'est ajoutée, seuls les contrôles de textes alternatifs s'appliquent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { articles } from '../src/data/articles.js';
import { photos } from '../src/data/photos.js';
import { photoAlt } from '../src/data/imageAlt.js';

const pub = (p) => new URL(`../public${p}`, import.meta.url);

test('textes alternatifs : uniquement pour des articles existants, 125 caractères maximum, descriptifs', () => {
  const slugs = new Set(articles.map((a) => a.slug));
  for (const [slug, alt] of Object.entries(photoAlt)) {
    assert.ok(slugs.has(slug), `imageAlt.js : article inexistant ${slug}`);
    assert.ok(alt.length >= 20 && alt.length <= 125, `${slug} : texte alternatif de ${alt.length} caractères`);
    assert.ok(!/^(image|photo|illustration) (de|d’|d')/i.test(alt), `${slug} : ne pas commencer par « image de »`);
  }
});

test('chaque article intégré a un texte alternatif prêt pour sa future photo', () => {
  for (const a of articles) assert.ok(photoAlt[a.slug], `${a.slug} : ajouter son texte dans src/data/imageAlt.js`);
});

test('photos : fichiers présents, 3 tailles WebP légères, texte alternatif, dimensions déclarées', () => {
  for (const [slug, photo] of Object.entries(photos)) {
    const article = articles.find((a) => a.slug === slug);
    assert.ok(article, `photos.js : article inexistant ${slug}`);
    assert.ok(photoAlt[slug], `${slug} : photo sans texte alternatif`);
    assert.equal(article.image, photo.src);
    assert.equal(article.imageSrcset, photo.srcset);
    assert.equal(article.imageAlt, photoAlt[slug]);
    assert.equal(photo.width / photo.height, 712 / 384);
    for (const [width, kb] of [[480, 60], [712, 110], [1424, 300]]) {
      const file = pub(`/images/photos/${slug}-${width}.webp`);
      assert.ok(fs.existsSync(file), `${slug} : fichier ${width}px manquant`);
      assert.ok(fs.statSync(file).size <= kb * 1024, `${slug} : ${width}px dépasse ${kb} Ko`);
      assert.ok(photo.srcset.includes(`${slug}-${width}.webp ${width}w`));
    }
  }
});
