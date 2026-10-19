// ============================================================================
// Génération des illustrations d'articles :   npm run images
//
//   npm run images                 crée les images manquantes ou périmées (titre/catégories/texte modifiés)
//   npm run images -- --force      régénère TOUTES les images
//   npm run images -- --slug=xxx   régénère l'image d'un seul article
//   npm run images -- --check      ne crée rien : liste les articles sans image à jour (code de sortie 1)
//
// Chaque image est enregistrée dans public/images/articles/<slug>.svg, et le registre
// src/data/images.js associe l'image à l'article. Les images ne sont jamais partagées entre articles.
// À lancer après chaque intégration d'un nouvel article (étape obligatoire avant « Publié »).
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderIllustration, hashString } from '../src/lib/illustration.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/images/articles');
const registryFile = path.join(root, 'src/data/images.js');
export const GENERATOR_VERSION = 2; // à augmenter si le dessin change : toutes les images deviennent « périmées »

export function articleText(article) {
  return (article.content ?? [])
    .filter((b) => b.type === 'p')
    .map((b) => b.text)
    .join(' ')
    .replace(/\*\*/g, '')
    .slice(0, 400);
}

export function fingerprint(article) {
  const source = [GENERATOR_VERSION, article.slug, article.title, (article.categories ?? []).join('|'), articleText(article)].join('\n');
  return hashString(source).toString(36);
}

export async function loadArticles() {
  const { articles } = await import('../src/data/articles.js');
  return articles;
}

export async function loadRegistry() {
  const { generatedImages } = await import(`../src/data/images.js?${Date.now()}`);
  return generatedImages;
}

/** Articles dont l'image manque, est périmée ou dont le fichier a disparu. */
export function findStale(articles, registry) {
  return articles.filter((a) => {
    const entry = registry[a.slug];
    return !entry || entry.hash !== fingerprint(a) || !fs.existsSync(path.join(outDir, `${a.slug}.svg`));
  });
}

function writeRegistry(registry) {
  const sorted = Object.fromEntries(Object.entries(registry).sort(([a], [b]) => a.localeCompare(b)));
  const body =
    "// REGISTRE DES ILLUSTRATIONS — fichier généré par `npm run images` (ne pas modifier à la main).\n" +
    "// Associe chaque article (slug) à son image, au sujet dessiné et à une empreinte de son contenu.\n" +
    'export const generatedImages = ' + JSON.stringify(sorted, null, 2) + ';\n';
  fs.writeFileSync(registryFile, body, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const checkOnly = args.includes('--check');
  const only = args.find((a) => a.startsWith('--slug='))?.slice(7);

  const articles = await loadArticles();
  const registry = { ...(await loadRegistry()) };
  let todo = force ? articles : findStale(articles, registry);
  if (only) {
    todo = articles.filter((a) => a.slug === only);
    if (!todo.length) { console.error(`Aucun article avec l'adresse « ${only} ».`); process.exit(1); }
  }

  if (checkOnly) {
    if (!todo.length) { console.log(`OK : les ${articles.length} articles ont une illustration à jour.`); return; }
    console.log(`${todo.length} article(s) sans illustration à jour :`);
    todo.forEach((a) => console.log(` - ${a.slug}`));
    console.log('Lancez : npm run images');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  for (const article of todo) {
    const { svg, motif, secondary, theme } = renderIllustration({
      slug: article.slug,
      title: article.title,
      categories: article.categories,
      text: articleText(article),
    });
    fs.writeFileSync(path.join(outDir, `${article.slug}.svg`), svg, 'utf8');
    registry[article.slug] = {
      file: `/images/articles/${article.slug}.svg`,
      motif,
      secondary,
      theme,
      hash: fingerprint(article),
      generatedAt: today,
    };
    console.log(`+ ${article.slug}  [${motif}${secondary ? ' + ' + secondary : ''}, ${theme}]  ${(svg.length / 1024).toFixed(1)} Ko`);
  }
  // Retire du registre les articles qui n'existent plus (les fichiers images restent, par prudence)
  for (const slug of Object.keys(registry)) if (!articles.some((a) => a.slug === slug)) delete registry[slug];
  writeRegistry(registry);
  console.log(todo.length ? `${todo.length} illustration(s) créée(s).` : 'Rien à faire : toutes les illustrations sont à jour.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
