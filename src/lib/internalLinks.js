// Création des liens contextuels entre articles (règles : voir src/data/internalLinks.js).
// Le texte source n'est pas modifié : on renvoie une COPIE du contenu où une expression est remplacée
// par « [expression](/adresse) », que inlineToHtml transforme en lien <a>.
import { linkTargets, MAX_INLINE_LINKS } from '../data/internalLinks.js';

function insideBold(text, index) {
  const before = text.slice(0, index);
  return (before.match(/\*\*/g) || []).length % 2 === 1;
}
function insideLink(text, index) {
  // Dans un lien déjà créé : [texte](/adresse) — ni son texte, ni son adresse ne peuvent recevoir un autre lien.
  for (const m of text.matchAll(/\[[^\]]*\]\([^)]*\)/g)) if (index >= m.index && index < m.index + m[0].length) return true;
  return false;
}

/** Cherche la 1re occurrence utilisable d'une des expressions dans le texte (mot entier, hors gras, hors lien). */
function findAnchor(text, phrases) {
  let best = null;
  for (const phrase of phrases) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}\\p{N}])`, 'giu');
    let m;
    while ((m = re.exec(text))) {
      const start = m.index + m[1].length;
      if (insideBold(text, start) || insideLink(text, start)) continue;
      if (!best || start < best.start) best = { start, end: start + m[2].length };
      break;
    }
  }
  return best;
}

/**
 * Renvoie { content, links } : le contenu avec les liens contextuels, et la liste des liens créés
 * [{ slug, anchor }]. `existingSlugs` = adresses des articles qui existent (aucun lien vers autre chose).
 */
export function addInternalLinks(article, existingSlugs, targets = linkTargets, max = MAX_INLINE_LINKS) {
  const exists = new Set(existingSlugs);
  const used = new Set();
  const links = [];
  const content = article.content.map((block) => ({ ...block, items: block.items ? [...block.items] : undefined }));

  const PER_PASSAGE = 2; // 2 liens au maximum dans un même paragraphe ou une même puce
  const apply = (text) => {
    let out = text;
    for (let n = 0; n < PER_PASSAGE && links.length < max; n++) {
      const next = applyOne(out);
      if (next === out) break;
      out = next;
    }
    return out;
  };
  const applyOne = (text) => {
    if (links.length >= max) return text;
    let out = text;
    let pick = null;
    for (const [slug, phrases] of Object.entries(targets)) {
      if (slug === article.slug || used.has(slug) || !exists.has(slug)) continue;
      const hit = findAnchor(out, phrases);
      if (hit && (!pick || hit.start < pick.hit.start)) pick = { slug, hit };
    }
    if (pick) {
      const anchor = out.slice(pick.hit.start, pick.hit.end);
      out = `${out.slice(0, pick.hit.start)}[${anchor}](/${pick.slug})${out.slice(pick.hit.end)}`;
      used.add(pick.slug);
      links.push({ slug: pick.slug, anchor });
    }
    return out;
  };

  for (const block of content) {
    if (links.length >= max) break;
    if (block.type === 'p' || block.type === 'conclusion') block.text = apply(block.text);
    else if (block.type === 'ul' || block.type === 'ol') block.items = block.items.map(apply);
  }
  return { content, links };
}
