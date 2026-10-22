// Page /recherche : lit ?q=..., charge /search-index.json, affiche les résultats.
import { searchArticles, tokenize } from '../lib/search.js';

const form = document.getElementById('search-page-form');
const input = document.getElementById('search-page-input');
const summary = document.getElementById('search-summary');
const list = document.getElementById('search-results');
const empty = document.getElementById('search-empty');
const headerInput = document.querySelector('.search__input');

let indexPromise;
function loadIndex() {
  indexPromise ??= fetch('/search-index.json').then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
  return indexPromise;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderResult({ article, snippet }) {
  const card = el('a', 'result-card');
  card.href = article.url;

  const img = el('img', 'result-card__image');
  img.src = article.image;
  if (article.imageSrcset) { img.srcset = article.imageSrcset; img.sizes = '(min-width: 1024px) 357px, 100vw'; }
  img.alt = article.imageAlt || '';
  img.width = 712;
  img.height = 384;
  img.loading = 'lazy';
  img.decoding = 'async';
  card.append(img);

  const body = el('div', 'result-card__body');
  body.append(el('h2', 'result-card__title', article.cardTitle || article.title));

  // Mêmes catégories, mêmes pastilles que sur les cartes et les pages d'articles
  const cats = el('ul', 'category-list category-list--tags');
  cats.setAttribute('aria-label', 'Catégories');
  for (const category of article.categories) cats.append(el('li', 'category-list__item', category));
  body.append(cats);

  body.append(el('p', 'result-card__excerpt', article.excerpt));
  if (snippet) body.append(el('p', 'result-card__snippet', `Dans l'article : ${snippet}`));
  body.append(el('span', 'result-card__more', "Lire l'article →"));
  card.append(body);
  return card;
}

async function run(query) {
  const trimmed = query.trim();
  list.replaceChildren();
  empty.hidden = true;

  if (!tokenize(trimmed).length) {
    summary.textContent = 'Saisissez un mot ou une expression pour rechercher un article.';
    return;
  }

  summary.textContent = 'Recherche en cours…';
  try {
    const index = await loadIndex();
    const results = searchArticles(index, trimmed);
    if (results.length === 0) {
      summary.textContent = '';
      empty.hidden = false;
      empty.querySelector('[data-query]').textContent = trimmed;
      return;
    }
    summary.textContent =
      results.length === 1
        ? `1 article trouvé pour « ${trimmed} »`
        : `${results.length} articles trouvés pour « ${trimmed} »`;
    list.append(...results.map(renderResult));
  } catch (error) {
    summary.textContent = 'La recherche est momentanément indisponible. Réessayez dans un instant.';
    console.error(error);
  }
}

const initial = new URLSearchParams(window.location.search).get('q') ?? '';
input.value = initial;
if (headerInput) headerInput.value = initial;
run(initial);

// Nouvelle recherche depuis la page : on reste sur la page, sans la recharger
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value;
  const url = new URL(window.location.href);
  url.searchParams.set('q', query);
  window.history.pushState({}, '', url);
  if (headerInput) headerInput.value = query;
  run(query);
});

window.addEventListener('popstate', () => {
  const q = new URLSearchParams(window.location.search).get('q') ?? '';
  input.value = q;
  if (headerInput) headerInput.value = q;
  run(q);
});
