// ARTICLES PUBLIÉS PAR L'AUTOMATISATION QUOTIDIENNE (scripts/publish/run.mjs).
// Fichier géré par le robot : il y ajoute un article quand une ligne du Sheet passe à « à intégrer ».
// Même structure que src/data/sheetArticlesLot2.js. Ne pas modifier à la main sans raison.
export const autoArticles = [
  {
    "slug": "essai-de-build-automatique-branche-de-test-ne-pas-publier",
    "title": "Essai de build automatique (branche de test, ne pas publier)",
    "categories": [
      "VAE général"
    ],
    "excerpt": "Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot. Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot.",
    "summary": "Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot. Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot.",
    "updatedAt": "2026-10-29",
    "author": "La Rédaction de Info-VAE",
    "image": "/images/article-default.jpg",
    "imageAlt": "",
    "provisional": false,
    "source": {
      "sheetRow": 22,
      "docId": "ESSAIBUILD1234567890abcdefghi",
      "sheetStatus": "à intégrer"
    },
    "content": [
      {
        "type": "p",
        "text": "Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot. Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot."
      },
      {
        "type": "h2",
        "text": "Une section"
      },
      {
        "type": "p",
        "text": "Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot. Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot."
      },
      {
        "type": "ul",
        "items": [
          "premier point de liste",
          "deuxième point de liste"
        ]
      },
      {
        "type": "h2",
        "text": "Une autre section"
      },
      {
        "type": "p",
        "text": "1. Étape une. Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot."
      },
      {
        "type": "p",
        "text": "2. Étape deux. Ceci est un paragraphe de test suffisamment long pour représenter un vrai article de blog sur la VAE et ses étapes principales, avec assez de mots pour passer le contrôle de longueur minimale du robot."
      }
    ]
  }
];
