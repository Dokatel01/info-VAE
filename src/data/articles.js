// ============================================================================
// DONNÉES PROVISOIRES DES ARTICLES (étape « pages d'articles »)
//
// Ces données remplacent, pour l'instant, le Google Sheets « Suivi article site
// info VAE » et les Google Docs. RIEN n'est connecté à Google ici.
//
// Chaque article reprend les champs qu'on retrouvera plus tard dans le suivi :
//   slug         adresse de la page : /<slug>  (stable : ne pas la changer une fois publiée)
//   title        titre complet (page d'article)
//   cardTitle    titre court de la carte d'accueil (si différent du titre)
//   breadcrumbTitle  titre court du fil d'Ariane (facultatif)
//   categories   LISTE de catégories, écrites EXACTEMENT comme dans la source.
//                Un article peut en avoir plusieurs. Aucune catégorie n'est créée
//                ni remplacée automatiquement : c'est cette liste, et elle seule,
//                qui alimente les cartes, la page d'article et la recherche.
//   excerpt      court extrait des cartes
//   summary      résumé de la page d'article (carte du haut)
//   updatedAt    date de mise à jour (AAAA-MM-JJ)
//   author       signature
//   image        image de la carte (712 × 384 px conseillé)
//   related      adresses (slugs) des articles liés — facultatif
//   provisional  true = contenu d'attente, à remplacer par le vrai texte
//   content      contenu : suite de blocs (voir plus bas)
//
// Blocs de contenu (provisoire, avant la conversion des Google Docs) :
//   { type: 'p',  text }        paragraphe ; **gras** et retour à la ligne (\n) permis
//   { type: 'h2', text }        titre de section : alimente le « Plan article »
//   { type: 'h3', text }        sous-titre
//   { type: 'ul', items: [...] } liste à puces ; **gras** permis
//   { type: 'ol', items: [...] } liste numérotée ; **gras** permis
//   { type: 'hr' }              séparateur
//   { type: 'conclusion', text } paragraphe de conclusion (en italique)
// ============================================================================

import { slugify, inlineToPlain } from '../lib/text.js';
import { sheetArticles } from './sheetArticles.js';
import { sheetArticlesLot2 } from './sheetArticlesLot2.js';
import { autoArticles } from './autoArticles.js';
import { generatedImages } from './images.js';
import { photos } from './photos.js';
import { photoAlt } from './imageAlt.js';
import { addInternalLinks } from '../lib/internalLinks.js';

// Ligne 2 du Sheet (adresse /combien-coute-la-vae, déjà utilisée par la navigation).
// Les deux autres articles de démonstration (provisoires) ont été remplacés par les lignes 3 et 21
// du Sheet (src/data/sheetArticlesLot2.js), aux mêmes adresses.
const baseArticles = [
  {
    slug: 'combien-coute-la-vae', // adresse déjà utilisée par la nav et par la référence
    title: 'Tarif accompagnement et frais de passage devant le jury : combien coûte réellement une VAE',
    cardTitle: 'Combien coûte une VAE ?',
    breadcrumbTitle: 'Tarif accompagnement et frais de passage devant le jury',
    categories: ['Tarif'], // ligne 2 du Sheet : catégorie « Tarif »
    excerpt: "Analysez le coût global d'une démarche de VAE et préparez votre budget en conséquence.",
    summary:
      "La Validation des Acquis de l'Expérience (VAE) est un dispositif permettant de transformer une expérience professionnelle en un diplôme, un titre ou une certification reconnue. Découvrez les différents coûts et options de financement.",
    updatedAt: '2026-10-14',
    author: 'La Rédaction de Info-VAE',
    image: '/images/article-cout-vae.jpg',
    imageAlt: '',
    provisional: false,
    content: [
      {
        type: 'p',
        text: "La Validation des Acquis de l'Expérience (VAE) est un dispositif permettant de transformer une expérience professionnelle en un diplôme, un titre ou une certification reconnue. Mais avant de se lancer, il est essentiel d'anticiper les coûts qu'implique cette démarche. Combien faut-il prévoir pour une VAE ? Quels sont les frais obligatoires et les coûts optionnels ? Existe-t-il des solutions de financement ? Voici un tour d'horizon complet.",
      },
      { type: 'h2', text: "Les différents coûts d'une VAE" },
      {
        type: 'p',
        text: "Le prix d'une VAE varie selon plusieurs critères, notamment l'organisme certificateur, le niveau du diplôme visé et les services choisis.",
      },
      { type: 'h3', text: "Les frais d'inscription et de certification" },
      {
        type: 'p',
        text: "Les frais d'inscription à une VAE dépendent principalement de l'organisme certificateur et du niveau du diplôme visé. En général, plus le diplôme est élevé, plus le coût d'inscription est important. Par exemple, un CAP coûtera moins cher qu'un BTS ou une Licence.\nLe montant des frais peut varier de quelques centaines d'euros à plus de 1 000 €, avec une moyenne autour de 1 500 €. Certains établissements publics ou dispositifs spécifiques permettent toutefois d'accéder à une VAE gratuitement, notamment pour certains titres professionnels financés par l'État ou les régions.",
      },
      { type: 'h3', text: "Les frais d'accompagnement" },
      {
        type: 'p',
        text: "L'accompagnement n'est pas obligatoire, mais il est fortement recommandé pour mettre toutes les chances de son côté. Il consiste à bénéficier d'un suivi personnalisé par un expert qui aide à la rédaction du dossier et à la préparation du passage devant le jury.",
      },
      {
        type: 'ul',
        items: [
          'En moyenne, **entre 1 500 € et 3 000 €** pour un accompagnement complet.',
          "Certains organismes facturent des séances à l'heure, avec des tarifs allant de **50 à 150 € de l'heure**.",
        ],
      },
      { type: 'h3', text: 'Les coûts annexes' },
      { type: 'p', text: "D'autres frais peuvent s'ajouter selon les besoins et la situation du candidat :" },
      {
        type: 'ul',
        items: [
          '**Frais de validation** : Certains organismes facturent la présentation au jury, avec des coûts pouvant atteindre 500 €.',
          "**Frais de déplacement** : Si le centre de validation se trouve loin du domicile, les frais de transport et d'hébergement peuvent être à prévoir.",
          '**Formations complémentaires** : Dans certains cas, un candidat doit suivre des formations courtes pour répondre aux exigences du diplôme visé. Ces formations peuvent coûter entre **300 € et 2 000 €** selon la durée et le niveau.',
        ],
      },
      { type: 'h2', text: 'Comment financer sa VAE ?' },
      { type: 'p', text: "Heureusement, plusieurs dispositifs existent pour aider à financer tout ou partie d'une VAE." },
      { type: 'h3', text: 'Le Compte Personnel de Formation (CPF)' },
      {
        type: 'p',
        text: "Le CPF permet de financer une partie ou la totalité des frais de VAE, notamment l'accompagnement. Chaque salarié cotise tout au long de sa carrière et peut utiliser ces fonds pour financer son projet.",
      },
      { type: 'h3', text: 'Les aides de Pôle emploi' },
      {
        type: 'p',
        text: "Les demandeurs d'emploi peuvent bénéficier d'un financement via Pôle emploi, notamment grâce à l'AIF (Aide Individuelle à la Formation). Cette aide peut couvrir tout ou partie des frais engagés.",
      },
      { type: 'h3', text: 'Les aides des régions et OPCO' },
      {
        type: 'p',
        text: "Certaines régions proposent des financements pour les VAE, notamment pour les personnes en reconversion professionnelle. De plus, les OPCO (Opérateurs de Compétences) peuvent également prendre en charge une partie du coût pour les salariés.",
      },
      { type: 'hr' },
      { type: 'h2', text: 'Optimiser son budget pour une VAE' },
      { type: 'p', text: 'Pour réduire les coûts, voici quelques conseils :' },
      {
        type: 'ul',
        items: [
          "**Comparer les offres d'accompagnement** et choisir un organisme avec un bon rapport qualité-prix.",
          "**Vérifier les aides auxquelles on est éligible** avant de s'engager dans une démarche de VAE.",
          '**Négocier avec son employeur** pour obtenir une prise en charge totale ou partielle.',
          '**Utiliser son CPF** pour couvrir les frais principaux.',
        ],
      },
      {
        type: 'conclusion',
        text: "Le coût d'une VAE varie selon les options choisies et les besoins de chacun. Entre les frais d'inscription, l'accompagnement et les éventuels coûts annexes, le budget peut osciller entre quelques centaines et plusieurs milliers d'euros. Heureusement, de nombreux dispositifs permettent de financer tout ou partie du parcours. Avant de se lancer, il est essentiel de bien se renseigner et d'évaluer les différentes solutions de financement afin de mener à bien son projet de certification.",
      },
    ],
  },
];

// Articles issus du Google Sheets (voir src/data/sheetArticles.js), ajoutés à la suite.
// L'illustration de chaque article est créée par `npm run images` (src/lib/illustration.js) et
// enregistrée dans src/data/images.js : si elle existe, elle remplace l'image par défaut.
// Un article sans illustration garde l'image indiquée dans ses données (image par défaut).
// Les extraits et résumés sont affichés en texte simple : le gras (**…**) du Google Doc n'y apparaît pas.
const plain = (article) => ({ ...article, excerpt: inlineToPlain(article.excerpt), summary: inlineToPlain(article.summary) });

export const articles = [...baseArticles, ...sheetArticles, ...sheetArticlesLot2, ...autoArticles].map(plain).map((article) => {
  // 1) photo optimisée (src/data/photos.js) avec son texte alternatif, 2) sinon illustration générée, 3) sinon image par défaut.
  const photo = photos[article.slug];
  if (photo && photoAlt[article.slug]) {
    return { ...article, image: photo.src, imageSrcset: photo.srcset, imageAlt: photoAlt[article.slug] };
  }
  const generated = generatedImages[article.slug];
  return generated ? { ...article, image: generated.file } : article;
});

/** Adresses déjà prises par d'autres pages du site : un article ne peut pas les utiliser. */
export const reservedSlugs = ['recherche', 'search-index'];

export function getArticle(slug) {
  return articles.find((article) => article.slug === slug);
}

export function articleUrl(article) {
  return `/${article.slug}`;
}

/** Sommaire : un lien par titre de niveau 2. */
export function getToc(article) {
  return article.content
    .filter((block) => block.type === 'h2')
    .map((block) => ({ text: block.text, id: slugifyHeading(block.text) }));
}

export function slugifyHeading(text) {
  return slugify(text);
}

// Mots trop courants pour compter dans la ressemblance de deux titres.
const STOP = new Set(['vae', 'pour', 'une', 'des', 'les', 'que', 'qui', 'est', 'ce', 'qu', 'il', 'faut', 'savoir', 'comment', 'peut', 'sur', 'dans', 'par', 'son', 'ses', 'sa', 'la', 'le', 'de', 'du', 'et', 'en', 'un', 'au', 'aux', 'ou', 'à', 'avec', 'quelques', 'conseils', 'validation', 'acquis', 'experience', 'diplome', 'etat']);
const words = (text) => new Set(slugify(text).split('-').filter((w) => w.length > 2 && !STOP.has(w)));

/**
 * « Articles liés » : 3 articles au maximum, uniquement parmi les articles EXISTANTS.
 * 1) ceux indiqués à la main dans `related` (adresses), sinon
 * 2) les plus proches, par score : catégories communes (3 points chacune), lien dans le texte dans un sens
 *    ou dans l'autre (2 points), mots communs des titres (1 point chacun). À score égal : ordre alphabétique
 *    des adresses, donc le résultat ne change pas d'une construction du site à l'autre.
 * Un nouvel article est donc relié automatiquement, sans rien configurer.
 */
export function getRelated(article, pool = articles) {
  const others = pool.filter((item) => item.slug !== article.slug);
  if (article.related) return article.related.map((slug) => others.find((o) => o.slug === slug)).filter(Boolean).slice(0, 3);
  const slugs = pool.map((a) => a.slug);
  const outgoing = new Set(addInternalLinks(article, slugs).links.map((l) => l.slug));
  const titleWords = words(article.title);
  const scored = others.map((other) => {
    const shared = other.categories.filter((c) => article.categories.includes(c)).length;
    const linked = outgoing.has(other.slug) || addInternalLinks(other, slugs).links.some((l) => l.slug === article.slug);
    const common = [...words(other.title)].filter((w) => titleWords.has(w)).length;
    return { other, score: shared * 3 + (linked ? 2 : 0) + common };
  });
  scored.sort((a, b) => b.score - a.score || a.other.slug.localeCompare(b.other.slug));
  return scored.slice(0, 3).map((x) => x.other);
}
