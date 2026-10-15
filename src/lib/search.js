// Moteur de recherche (sans dépendance) : fonctionne dans le navigateur et dans les tests.
//
// Principe : on cherche TOUS les mots saisis (« cpf pôle » = les deux mots).
// Un mot peut être un début de mot (« financ » trouve « financer »). Accents et
// majuscules sont ignorés. Un article remonte d'autant plus haut que le mot est
// dans son titre, puis ses catégories, puis son résumé, puis son contenu.

export const WEIGHTS = { title: 10, categories: 8, excerpt: 4, content: 1 };

/** Minuscules, sans accents, espaces simplifiés. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mots de la requête (1 caractère ou plus, sans doublons). */
export function tokenize(query) {
  const words = normalize(query).split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set(words)];
}

/** Comme `normalize`, mais sans toucher aux espaces : le texte garde la même longueur. */
function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Extrait du contenu autour du premier mot trouvé (pour les résultats qui ne matchent que dans le texte). */
export function makeSnippet(content, tokens, length = 160) {
  const text = String(content ?? '');
  const folded = fold(text);
  let index = -1;
  for (const token of tokens) {
    const found = folded.indexOf(token);
    if (found !== -1 && (index === -1 || found < index)) index = found;
  }
  if (index === -1) return '';
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, start + length);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/**
 * @param {Array<{slug,url,title,cardTitle?,excerpt,summary?,categories:string[],content:string}>} index
 * @param {string} query
 * @returns {Array<{article, score, snippet}>} résultats triés (meilleur d'abord)
 */
export function searchArticles(index, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results = [];
  for (const article of index) {
    const fields = {
      title: normalize(`${article.title} ${article.cardTitle ?? ''}`),
      categories: normalize((article.categories ?? []).join(' ')),
      excerpt: normalize(`${article.excerpt ?? ''} ${article.summary ?? ''}`),
      content: normalize(article.content),
    };

    let score = 0;
    let everyTokenFound = true;
    let foundOutsideContent = false;
    for (const token of tokens) {
      let tokenScore = 0;
      for (const [field, weight] of Object.entries(WEIGHTS)) {
        if (fields[field].includes(token)) {
          tokenScore += weight;
          if (field !== 'content') foundOutsideContent = true;
        }
      }
      if (tokenScore === 0) {
        everyTokenFound = false;
        break;
      }
      score += tokenScore;
    }
    if (!everyTokenFound) continue;

    results.push({
      article,
      score,
      snippet: foundOutsideContent ? '' : makeSnippet(article.content, tokens),
    });
  }

  return results.sort(
    (a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title, 'fr'),
  );
}
