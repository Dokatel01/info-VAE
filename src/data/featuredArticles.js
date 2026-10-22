// Articles affichés dans « Articles en vedette » sur la page d'accueil.
//
// Ils sont construits à partir de src/data/articles.js : le titre de la carte, les
// catégories (affichées en pastilles), l'image et le lien viennent donc de la MÊME
// source que la page d'article et la recherche. Pour changer un texte ou une
// catégorie, on modifie articles.js, jamais ce fichier.
//
// Pour changer les articles mis en avant ou leur ordre : modifier la liste ci-dessous.

import { articles, getArticle, articleUrl } from './articles.js';

function toCard(article) {
  return {
    slug: article.slug,
    title: article.cardTitle ?? article.title,
    excerpt: article.excerpt,
    tags: article.categories,
    image: article.image,
    imageSrcset: article.imageSrcset,
    imageAlt: article.imageAlt,
    href: articleUrl(article),
  };
}

// Sélection par défaut (affichée si JavaScript est désactivé, et avant le tirage au sort).
const defaultSlugs = ['qui-peut-faire-une-vae', 'aides-financieres-vae', 'combien-coute-la-vae'];
export const defaultFeaturedSlugs = defaultSlugs;

// TOUS les articles du site, sous forme de cartes. Le navigateur en tire 3 au hasard à chaque visite
// (voir le script dans FeaturedArticles.astro). Un nouvel article intégré dans articles.js
// entre automatiquement dans le tirage.
export const allCards = articles.map(toCard);

export const featuredArticles = defaultSlugs.map((slug) => toCard(getArticle(slug)));
