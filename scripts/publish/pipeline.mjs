// ============================================================================
// PUBLICATION AUTOMATIQUE DES ARTICLES — logique principale (sans accès direct à Google/Git/réseau :
// tout passe par `deps`, ce qui permet de la tester avec des simulations).
//
// Règles (voir docs/automatisation-publication.md) :
//   1. seules les lignes dont l'état est exactement « à intégrer » sont traitées (« En cours d'examen », « Publié »… jamais) ;
//   2. un article n'est jamais marqué « Publié » avant d'avoir été vu en ligne (page accessible, titre présent) ;
//   3. une erreur sur un article n'arrête pas les autres ;
//   4. aucun doublon : un Doc déjà intégré n'est pas recréé, il est seulement re-vérifié puis marqué ;
//   5. aucune ligne « à intégrer » : rien n'est modifié ;
//   6. les Google Docs ne sont jamais modifiés (accès en lecture seule).
// ============================================================================
import { officialCategories, parseSheetCategories } from '../../src/data/categories.js';
import { slugify } from '../../src/lib/text.js';
import { parseDocMarkdown } from '../../src/lib/docToBlocks.js';
import { docIdFromUrl } from './google.mjs';

export const STATUS_TO_INTEGRATE = 'à intégrer';
export const STATUS_PUBLISHED = 'Publié';
export const AUTHOR = 'La Rédaction de Info-VAE';
export const DEFAULT_IMAGE = '/images/article-default.jpg';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const clean = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** « à intégrer » exactement (espaces et forme Unicode ignorés ; majuscules/accents NON ignorés). */
export function isToIntegrate(status) {
  return clean(status) === STATUS_TO_INTEGRATE;
}

export function columnLetter(index) {
  let n = index + 1, s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Repère la ligne d'en-têtes et les colonnes utiles par leur NOM (pas par leur position). */
export function parseSheet(rows) {
  const wanted = { title: 'titre', categories: 'categorie', status: 'etat', date: 'date de publication', file: 'fichier' };
  const headerRow = rows.find((r) => r.cells.some((c) => norm(c.text) === 'titre') && r.cells.some((c) => norm(c.text) === 'etat'));
  if (!headerRow) throw new Error('En-têtes introuvables dans le Sheet (colonnes « Titre » et « État » attendues).');
  const col = {};
  for (const [key, name] of Object.entries(wanted)) {
    const idx = headerRow.cells.findIndex((c) => norm(c.text) === name);
    if (idx < 0) throw new Error(`Colonne « ${name} » introuvable dans le Sheet.`);
    col[key] = idx;
  }
  const items = rows
    .filter((r) => r.row > headerRow.row)
    .map((r) => {
      const cell = (k) => r.cells[col[k]] ?? { text: '', link: null };
      const link = cell('file').link;
      return {
        row: r.row,
        title: clean(cell('title').text),
        categoriesRaw: cell('categories').text,
        status: cell('status').text,
        link,
        docId: docIdFromUrl(link),
      };
    })
    .filter((it) => it.title || it.status || it.link);
  return { items, col };
}

export function parisDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Numéro de série Google Sheets d'une date AAAA-MM-JJ (jours depuis le 30/12/1899). */
export function sheetSerial(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

/** Texte alternatif provisoire (20 à 125 caractères), remplacé par une vraie description quand la photo existe. */
export function provisionalAlt(title) {
  const t = title.replace(/[\s?!.:]+$/g, '').trim();
  const max = 125 - 'Sur le thème : '.length;
  return `Sur le thème : ${t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t}`;
}

export function linkPhrase(title) {
  const phrase = title.replace(/[\s?!.:]+$/g, '').trim();
  return phrase.length >= 12 ? phrase : null;
}

/** Construit l'article à partir de la ligne du Sheet et du texte du Doc. Lève une erreur claire sinon. */
export function buildArticle({ item, markdown, today, slug }) {
  const { blocks } = parseDocMarkdown(markdown);
  const firstP = blocks.find((b) => b.type === 'p');
  if (!firstP) throw new Error('le Doc ne contient aucun paragraphe de texte');
  const wordCount = blocks.map((b) => (b.text ?? (b.items ?? []).join(' ') ?? '')).join(' ').split(/\s+/).filter(Boolean).length;
  if (wordCount < 40) throw new Error(`le Doc est trop court (${wordCount} mots) : probablement vide ou incomplet`);
  return {
    slug,
    title: item.title,
    categories: parseSheetCategories(item.categoriesRaw),
    excerpt: firstP.text,
    summary: firstP.text,
    updatedAt: today,
    author: AUTHOR,
    image: DEFAULT_IMAGE,
    imageAlt: '',
    provisional: false,
    source: { sheetRow: item.row, docId: item.docId, sheetStatus: STATUS_TO_INTEGRATE },
    content: blocks,
  };
}

export async function runPublication({ deps, today = parisDate(), dryRun = false, log = console.log }) {
  const results = [];
  const add = (item, outcome, detail, extra = {}) => {
    results.push({ row: item.row, title: item.title, outcome, detail, ...extra });
    log(`[ligne ${item.row}] ${outcome} — ${detail}`);
  };

  // 1) Lecture du Sheet
  const rows = await deps.sheet.read();
  const { items, col } = parseSheet(rows);
  const candidates = items.filter((it) => isToIntegrate(it.status));
  log(`Sheet lu : ${items.length} ligne(s) d'articles, ${candidates.length} à l'état « ${STATUS_TO_INTEGRATE} ».`);
  if (!candidates.length) return { results, summary: 'Aucun article « à intégrer » : rien à faire, rien n’a été modifié.', changed: false };

  // 2) Validation et préparation (sans rien écrire)
  const existing = await deps.repo.existing();
  const takenSlugs = new Set([...existing.all.map((a) => a.slug), ...existing.reserved, ...existing.pages]);
  const byDoc = new Map(existing.all.filter((a) => a.docId).map((a) => [a.docId, a]));
  const rowsUsed = new Map(existing.all.filter((a) => a.row).map((a) => [a.row, a]));
  const toBuild = [];
  const alreadyIn = [];
  const seenDocs = new Set();

  // RÈGLE DE LA PHASE DE TEST : un seul article par jour ouvré.
  // a) Reprise : un article déjà intégré au site mais pas encore marqué « Publié » est finalisé en priorité
  //    (c'est l'article du jour, aucun nouvel article n'est ajouté).
  // b) Sinon, si le robot a déjà publié un article aujourd'hui (date de Paris), il ne fait rien.
  // c) Sinon, seul le premier article « à intégrer » (ordre du Sheet) est traité ; en cas d'échec on s'arrête là.
  const recovery = candidates.find((it) => it.docId && byDoc.has(it.docId));
  if (!recovery) {
    const doneToday = (existing.auto || []).find((a) => a.updatedAt === today);
    if (doneToday) {
      return { results, summary: `Un article a déjà été publié aujourd’hui par le robot (/${doneToday.slug}) : règle « un seul article par jour », rien à faire, rien n’a été modifié.`, changed: false };
    }
  }
  const selected = recovery || candidates[0];
  log(`Règle « un seul article par jour » : ligne ${selected.row} retenue${recovery ? ' (reprise d’un article déjà intégré)' : ''} ; ${candidates.length - 1} autre(s) article(s) « ${STATUS_TO_INTEGRATE} » reporté(s) aux jours suivants.`);

  for (const item of [selected]) {
    try {
      if (!item.title) throw new Error('titre manquant');
      if (!item.docId) throw new Error('lien vers le Google Doc manquant ou illisible dans la colonne « Fichier »');
      if (seenDocs.has(item.docId)) throw new Error('ce Doc apparaît sur plusieurs lignes « à intégrer » : doublon, une seule ligne est traitée');
      seenDocs.add(item.docId);
      const already = byDoc.get(item.docId);
      if (already) { alreadyIn.push({ item, article: already }); continue; }
      const cats = parseSheetCategories(item.categoriesRaw);
      if (!cats.length) throw new Error('catégorie manquante dans le Sheet');
      const unknown = cats.filter((c) => !officialCategories.includes(c));
      if (unknown.length) throw new Error(`catégorie inconnue du site : « ${unknown.join('», «')} » (aucune catégorie n’est créée automatiquement)`);
      const slug = slugify(item.title);
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error(`adresse impossible à créer à partir du titre (« ${slug} »)`);
      if (takenSlugs.has(slug)) throw new Error(`l’adresse /${slug} existe déjà pour un autre article ou une autre page`);
      const rowOwner = rowsUsed.get(item.row);
      if (rowOwner) throw new Error(`la ligne ${item.row} est déjà associée à l’article /${rowOwner.slug} (lignes décalées dans le Sheet ?) : vérification manuelle`);
      let markdown;
      try { markdown = await deps.docs.exportMarkdown(item.docId); }
      catch (e) { throw new Error(`Google Doc inaccessible (${e.message}) — partagez-le avec le compte de service, en lecture`); }
      const entry = buildArticle({ item, markdown, today, slug });
      takenSlugs.add(slug);
      toBuild.push({ item, entry });
    } catch (e) {
      add(item, 'erreur', e.message);
    }
  }

  if (dryRun) {
    for (const { item, entry } of toBuild) add(item, 'simulation', `prêt à publier sous /${entry.slug} (${entry.content.length} blocs, catégories : ${entry.categories.join(', ')})`);
    for (const { item, article } of alreadyIn) add(item, 'simulation', `déjà intégré (/${article.slug}) : serait re-vérifié en ligne puis marqué « ${STATUS_PUBLISHED} »`);
    return { results, summary: 'Simulation : aucune modification effectuée.', changed: false };
  }

  // 3) Intégration dans le dépôt (un seul lot ; si la vérification du lot échoue, article par article)
  let currentAuto = existing.auto;
  let currentTargets = existing.targets;
  let currentAlts = existing.alts ?? {};
  const integrate = async (group) => {
    const auto = [...currentAuto, ...group.map((g) => g.entry)];
    const targets = { ...currentTargets };
    for (const g of group) { const p = linkPhrase(g.entry.title); if (p) targets[g.entry.slug] = [p]; }
    const alts = { ...currentAlts };
    for (const g of group) alts[g.entry.slug] = provisionalAlt(g.entry.title);
    try {
      await deps.repo.write({ auto, targets, alts });
      await deps.repo.images();
      const check = await deps.repo.check();
      if (!check.ok) { await deps.repo.reset(); return { ok: false, detail: `contrôles échoués : ${check.detail}` }; }
      await deps.repo.commit(`Publication automatique : ${group.map((g) => g.entry.title).join(' ; ')}`);
      currentAuto = auto; currentTargets = targets; currentAlts = alts;
      return { ok: true };
    } catch (e) {
      await deps.repo.reset().catch(() => {});
      return { ok: false, detail: e.message };
    }
  };

  const integrated = [];
  if (toBuild.length) {
    const batch = await integrate(toBuild);
    if (batch.ok) integrated.push(...toBuild);
    else if (toBuild.length === 1) add(toBuild[0].item, 'erreur', batch.detail);
    else {
      log(`Le lot complet a échoué (${batch.detail}) : essai article par article.`);
      for (const one of toBuild) {
        const r = await integrate([one]);
        if (r.ok) integrated.push(one); else add(one.item, 'erreur', r.detail);
      }
    }
    if (integrated.length) {
      try { await deps.repo.push(); }
      catch (e) {
        for (const { item } of integrated) add(item, 'erreur', `envoi vers GitHub impossible (${e.message}) : non publié, sera retenté au prochain passage`);
        integrated.length = 0;
      }
    }
  }

  // 4) Vérification en ligne, puis seulement après : mise à jour du Sheet
  const toVerify = [
    ...integrated.map(({ item, entry }) => ({ item, slug: entry.slug, date: today, isNew: true })),
    ...alreadyIn.map(({ item, article }) => ({ item, slug: article.slug, date: article.updatedAt || today, isNew: false })),
  ];
  for (const v of toVerify) {
    const { item } = v;
    const live = await deps.site.verify(v.slug, item.title);
    if (!live.ok) { add(item, 'erreur', `non vérifié en ligne (${live.detail}) : le Sheet n’est PAS modifié, nouvel essai au prochain passage`); continue; }
    try {
      const now = await deps.sheet.recheck(item.row);
      if (clean(now.title) !== item.title || now.docId !== item.docId) throw new Error('la ligne du Sheet a changé pendant l’exécution');
      if (now.status === STATUS_PUBLISHED) { add(item, 'publié', `/${v.slug} en ligne ; le Sheet indiquait déjà « ${STATUS_PUBLISHED} »`, { slug: v.slug }); continue; }
      if (!isToIntegrate(now.status)) throw new Error(`l’état de la ligne est devenu « ${now.status} » : non modifié`);
      await deps.sheet.markPublished(item.row, sheetSerial(v.date), col, { item, date: v.date });
      const back = await deps.sheet.recheck(item.row);
      if (back.status !== STATUS_PUBLISHED) throw new Error('relecture du Sheet : l’état n’est pas « Publié »');
      add(item, 'publié', `/${v.slug} en ligne et Sheet mis à jour (${STATUS_PUBLISHED}, ${v.date})${v.isNew ? '' : ' [article déjà intégré lors d’un passage précédent]'}`, { slug: v.slug });
    } catch (e) {
      add(item, 'erreur', `en ligne mais mise à jour du Sheet impossible (${e.message}) : sera reprise au prochain passage, sans doublon`, { slug: v.slug });
    }
  }
  const ok = results.filter((r) => r.outcome === 'publié').length;
  const ko = results.filter((r) => r.outcome === 'erreur').length;
  return { results, summary: `${ok} article(s) publié(s), ${ko} en erreur.`, changed: ok > 0 || integrated.length > 0 };
}
