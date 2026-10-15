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
//   { type: 'hr' }              séparateur
//   { type: 'conclusion', text } paragraphe de conclusion (en italique)
// ============================================================================

import { slugify } from '../lib/text.js';

export const articles = [
  {
    slug: 'qui-peut-faire-une-vae',
    title: 'Qui peut faire une VAE et pour quels diplômes ?',
    categories: ['Eligibilité', 'Diplômes'],
    excerpt: "Découvrez les conditions d'éligibilité et la liste des diplômes accessibles par la VAE.",
    summary: "Découvrez les conditions d'éligibilité et la liste des diplômes accessibles par la VAE.",
    updatedAt: '2026-10-14',
    author: 'La Rédaction de Info-VAE',
    image: '/images/article-eligibilite-diplomes.jpg',
    imageAlt: '',
    provisional: true,
    content: [
      { type: 'p', text: "[Contenu provisoire] Le texte de cet article sera fourni plus tard (Google Docs). Cette page sert à vérifier la mise en page, la recherche et les catégories." },
      { type: 'h2', text: 'Les conditions pour faire une VAE' },
      { type: 'p', text: "[Contenu provisoire] Texte à venir." },
      { type: 'h2', text: 'Les diplômes accessibles' },
      { type: 'p', text: "[Contenu provisoire] Texte à venir." },
    ],
  },
  {
    slug: 'aides-financieres-vae',
    title: 'Les aides financières pour la VAE : CPF, Pôle emploi...',
    categories: ['Financement', 'CPF', 'Pôle emploi'],
    excerpt: 'Explorez les différentes options de financement pour votre démarche de VAE.',
    summary: 'Explorez les différentes options de financement pour votre démarche de VAE.',
    updatedAt: '2026-10-14',
    author: 'La Rédaction de Info-VAE',
    image: '/images/article-aides-financieres.jpg',
    imageAlt: '',
    provisional: true,
    content: [
      { type: 'p', text: "[Contenu provisoire] Le texte de cet article sera fourni plus tard (Google Docs). Cette page sert à vérifier la mise en page, la recherche et les catégories." },
      { type: 'h2', text: 'Financer sa VAE avec le CPF' },
      { type: 'p', text: "[Contenu provisoire] Texte à venir." },
      { type: 'h2', text: 'Les aides de Pôle emploi' },
      { type: 'p', text: "[Contenu provisoire] Texte à venir." },
    ],
  },
  {
    slug: 'combien-coute-la-vae', // adresse déjà utilisée par la nav et par la référence
    title: 'Tarif accompagnement et frais de passage devant le jury : combien coûte réellement une VAE',
    cardTitle: 'Combien coûte une VAE ?',
    breadcrumbTitle: 'Tarif accompagnement et frais de passage devant le jury',
    categories: ['Coûts', 'Budget'],
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

/** Articles liés : ceux indiqués dans `related`, sinon les autres articles (3 au maximum). */
export function getRelated(article) {
  const others = articles.filter((item) => item.slug !== article.slug);
  const chosen = article.related
    ? article.related.map(getArticle).filter(Boolean)
    : others;
  return chosen.slice(0, 3);
}
