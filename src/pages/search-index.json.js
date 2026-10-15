// Index de recherche généré à la construction du site : /search-index.json
// Il contient, pour chaque article, ce que la recherche doit pouvoir trouver.
import { articles, articleUrl } from '../data/articles.js';
import { inlineToPlain } from '../lib/text.js';

function plainContent(article) {
  return article.content
    .map((block) => {
      if (block.type === 'ul') return block.items.map(inlineToPlain).join(' ');
      if (block.type === 'hr') return '';
      return inlineToPlain(block.text);
    })
    .filter(Boolean)
    .join(' ');
}

export function GET() {
  const index = articles.map((article) => ({
    slug: article.slug,
    url: articleUrl(article),
    title: article.title,
    cardTitle: article.cardTitle ?? '',
    excerpt: article.excerpt,
    summary: article.summary,
    categories: article.categories,
    image: article.image,
    imageAlt: article.imageAlt ?? '',
    content: plainContent(article),
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
