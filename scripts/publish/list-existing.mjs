// Affiche en JSON l'état actuel du site : articles (adresse, Doc, ligne), articles du robot, pages réservées.
// Lancé dans un processus séparé pour toujours lire les fichiers à jour.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] ?? '.');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { articles, reservedSlugs } = await imp('src/data/articles.js');
const { autoArticles } = await imp('src/data/autoArticles.js');
const { autoLinkTargets } = await imp('src/data/autoLinkTargets.js');
const { autoPhotoAlt } = await imp('src/data/autoImageAlt.js');
const pagesDir = path.join(root, 'src/pages');
const pages = fs.existsSync(pagesDir)
  ? fs.readdirSync(pagesDir).map((f) => f.replace(/\.[^.]+$/, '')).filter((n) => n && !n.startsWith('['))
  : [];
console.log(JSON.stringify({
  all: articles.map((a) => ({ slug: a.slug, docId: a.source?.docId ?? null, row: a.source?.sheetRow ?? null, updatedAt: a.updatedAt, content: a.content })),
  auto: autoArticles,
  targets: autoLinkTargets,
  alts: autoPhotoAlt,
  reserved: reservedSlugs,
  pages,
}));
