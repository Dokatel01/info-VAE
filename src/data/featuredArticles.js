// Articles affichés dans « Articles en vedette » sur la page d'accueil.
// Textes repris de la capture de référence.
//
// POUR CHANGER UNE IMAGE : remplacez le fichier dans public/images/ (même nom),
// ou changez le chemin `image` ci-dessous. Format conseillé : 712 × 384 px (ratio ~1,85).
// Si `image` est absent, l'image par défaut (article-default.jpg) est utilisée.
//
// À CONNECTER PLUS TARD : `href` pointe vers « # » tant que les pages d'articles
// n'existent pas (elles viendront avec l'intégration Google Docs / Google Sheets).

export const featuredArticles = [
  {
    title: 'Qui peut faire une VAE et pour quels diplômes ?',
    excerpt: "Découvrez les conditions d'éligibilité et la liste des diplômes accessibles par la VAE.",
    tags: ['Eligibilité', 'Diplômes'],
    image: '/images/article-eligibilite-diplomes.jpg',
    imageAlt: '',
    href: '#',
  },
  {
    title: 'Les aides financières pour la VAE : CPF, Pôle emploi...',
    excerpt: 'Explorez les différentes options de financement pour votre démarche de VAE.',
    tags: ['Financement', 'CPF', 'Pôle emploi'],
    image: '/images/article-aides-financieres.jpg',
    imageAlt: '',
    href: '#',
  },
  {
    title: 'Combien coûte une VAE ?',
    excerpt: "Analysez le coût global d'une démarche de VAE et préparez votre budget en conséquence.",
    tags: ['Coûts', 'Budget'],
    image: '/images/article-cout-vae.jpg',
    imageAlt: '',
    href: '#',
  },
];
