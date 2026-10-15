// Articles affichés dans « Articles en vedette » sur la page d'accueil.
//
// Ils sont construits à partir de src/data/articles.js : le titre de la carte, les
// catégories (affichées en pastilles), l'image et le lien viennent donc de la MÊME
// source que la page d'article et la recherche. Pour changer un texte ou une
// catégorie, on modifie articles.js, jamais ce fichier.
//
// Pour changer les articles mis en avant ou leur ordre : modifier la liste ci-dessous.

import { getArticle, articleUrl } from './articles.js';

const featuredSlugs = ['qui-peut-faire-une-vae', 'aides-financieres-vae', 'combien-coute-la-vae'];

export const featuredArticles = featuredSlugs.map((slug) => {
  const article = getArticle(slug);
  return {
    title: article.cardTitle ?? article.title,
    excerpt: article.excerpt,
    tags: article.categories,
    image: article.image,
    imageAlt: article.imageAlt,
    href: articleUrl(article),
  };
});
