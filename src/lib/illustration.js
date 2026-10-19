// ============================================================================
// GÉNÉRATEUR D'ILLUSTRATIONS DES ARTICLES (voie A : dessin par code, sans service externe)
//
// Pour un article (titre, catégories, texte), ce module :
//   1. choisit un SUJET (diplôme, financement, jury, étapes, etc.) d'après les mots du titre,
//      des catégories et du début du texte (fonction pickMotifs) ;
//   2. dessine une illustration vectorielle (SVG) aux couleurs du site : une scène blanche
//      arrondie sur un fond coloré, avec le sujet principal au centre et, si l'article en a un
//      deuxième, un petit médaillon dans le coin ;
//   3. varie le fond, les cercles décoratifs et la palette d'après l'adresse (slug) de l'article :
//      deux articles n'ont donc jamais exactement la même image, mais restent de la même famille.
//
// Le dessin est DÉTERMINISTE : le même article donne toujours exactement la même image.
// Format 712 × 384 (même proportions que les cartes). Le sujet reste dans la zone centrale pour
// supporter le recadrage des « Articles connexes » (712 × 320).
// Aucune dépendance : ce fichier fonctionne tel quel avec Node.
// ============================================================================

export const WIDTH = 712;
export const HEIGHT = 384;

// --- Couleurs du site (voir src/styles/variables.css) -------------------------
const C = {
  teal: '#046a7a',
  blue: '#2563eb',
  soft: '#e0f2f7',
  orange: '#ff8c00',
  yellow: '#eab308',
  yellowDark: '#ca8a04',
  cream: '#fefce8',
  purple: '#7e22ce',
  dark: '#1f2937',
  white: '#ffffff',
};

const THEMES = [
  { name: 'ocean', from: C.teal, to: C.blue, deco: C.white, decoOpacity: 0.12, accent: C.orange, spot: C.yellow },
  { name: 'lagon', from: C.soft, to: '#b6e0ea', deco: C.teal, decoOpacity: 0.1, accent: C.orange, spot: C.yellow },
  { name: 'soleil', from: C.cream, to: C.soft, deco: C.purple, decoOpacity: 0.08, accent: C.purple, spot: C.orange },
];

// --- Utilitaires ---------------------------------------------------------------
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ');
}

/** Empreinte numérique stable d'un texte (FNV-1a, 32 bits). */
export function hashString(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

// --- Choix du sujet --------------------------------------------------------------
// Chaque sujet a des mots-clés (sur texte sans accent). Le titre compte 3, les catégories 2,
// le début du texte 1. Le sujet au plus fort score est principal, le suivant est secondaire.
const MOTIF_RULES = {
  laptop: /\b(a distance|en ligne|visio|visioconference|numerique|digital)\b/,
  jury: /\b(jury|oral|entretien|soutenance)\b/,
  steps: /\b(etapes?|parcours|demarche|procedure|deroule)\b/,
  time: /\b(duree|delai|calendrier|combien de temps|dure|temps|mois|semaines)\b/,
  money: /\b(tarif|cout|couts|coute\w*|prix|budget|frais|euros?)\b/,
  card: /\b(cpf|compte personnel|financ\w*|pole emploi|opco|prise en charge|aides?)\b/,
  care: /\b(aide soignant\w*|aide-soignant\w*|soignant\w*|deas|sante|hopital|infirmi\w*)\b/,
  child: /\b(puericultur\w*|deap|assistante maternelle|petite enfance|enfants?|creche)\b/,
  advisor: /\b(accompagn\w*|conseill\w*|organisme|aide personnalisee)\b/,
  choose: /\b(choisir|choix|comparer|comparatif|selectionner)\b/,
  checklist: /\b(conditions?|criteres?|eligib\w*|prerequis|exigences?)\b/,
  people: /\b(qui peut|pour qui|profil|candidats?|public)\b/,
  diploma: /\b(diplomes?|certification|titre professionnel|obtenir|valider|validation)\b/,
};

// Repli d'après les catégories officielles du Sheet (libellés exacts, voir src/data/categories.js).
const CATEGORY_MOTIF = {
  tarif: 'money',
  'pour qui': 'people',
  financement: 'card',
  'etapes vae': 'steps',
  'auxiliaire puericulture': 'child',
  'aide soignant': 'care',
  'vae general': 'diploma',
  'educateur specialise': 'people',
};

// Poids par sujet : un mot très spécifique (« à distance », « jury »...) l'emporte sur un mot générique
// (« obtenir », « validation »...).
const MOTIF_WEIGHT = { laptop: 3, people: 1.6, jury: 1.5, choose: 1.5, care: 1.5, child: 1.2, advisor: 1, diploma: 0.8, steps: 0.8 };

export function pickMotifs({ title = '', categories = [], text = '' }) {
  const scores = {};
  const add = (value, weight) => {
    const haystack = normalize(value);
    for (const [motif, rule] of Object.entries(MOTIF_RULES)) {
      const hits = haystack.match(new RegExp(rule.source, 'g'));
      if (hits) scores[motif] = (scores[motif] ?? 0) + hits.length * weight * (MOTIF_WEIGHT[motif] ?? 1);
    }
  };
  add(title, 3);
  add(categories.join(' '), 2);
  add(String(text).slice(0, 400), 1);

  for (const category of categories) {
    const motif = CATEGORY_MOTIF[normalize(category).trim()];
    if (motif) scores[motif] = (scores[motif] ?? 0) + 1.5;
  }

  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1] || Object.keys(MOTIF_RULES).indexOf(a[0]) - Object.keys(MOTIF_RULES).indexOf(b[0]))
    .map(([motif]) => motif);
  const primary = ranked[0] ?? 'book';
  const secondary = ranked[1] ?? null;
  return { primary, secondary };
}

// --- Dessins des sujets ------------------------------------------------------------
// Chaque fonction dessine dans une zone locale de 420 × 264 (centre : 210, 132).
// k = couleurs du thème ; renvoie du SVG (texte).

const check = (cx, cy, s = 1, color = C.white, w = 6) =>
  `<path d="M${r1(cx - 9 * s)} ${r1(cy)} L${r1(cx - 2 * s)} ${r1(cy + 8 * s)} L${r1(cx + 11 * s)} ${r1(cy - 9 * s)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const euro = (cx, cy, s = 1, color = '#92400e') =>
  `<path d="M${r1(cx + 19 * s)} ${r1(cy - 23 * s)} A${r1(30 * s)} ${r1(30 * s)} 0 1 0 ${r1(cx + 19 * s)} ${r1(cy + 23 * s)}" fill="none" stroke="${color}" stroke-width="${r1(8 * s)}" stroke-linecap="round"/>` +
  `<path d="M${r1(cx - 38 * s)} ${r1(cy - 8 * s)} H${r1(cx + 6 * s)} M${r1(cx - 38 * s)} ${r1(cy + 8 * s)} H${r1(cx + 6 * s)}" stroke="${color}" stroke-width="${r1(7 * s)}" stroke-linecap="round"/>`;

const bust = (x, y, s, head, body) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-60" r="26" fill="${head}"/>` +
  `<path d="M-46 0 Q-46 -46 0 -46 Q46 -46 46 0 Z" fill="${body}"/></g>`;

const MOTIFS = {
  diploma: (k) => `
    <path d="M210 30 L292 60 L210 90 L128 60 Z" fill="${C.teal}"/>
    <path d="M166 78 V104 Q210 128 254 104 V78 L210 94 Z" fill="${C.blue}"/>
    <path d="M292 60 V94" stroke="${k.accent}" stroke-width="5" stroke-linecap="round"/><circle cx="292" cy="98" r="8" fill="${k.accent}"/>
    <rect x="96" y="112" width="228" height="118" rx="12" fill="${C.soft}" stroke="${C.teal}" stroke-width="5"/>
    <path d="M128 148 H292 M128 172 H262 M128 196 H226" stroke="${C.teal}" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/>
    <path d="M276 224 L262 256 L280 248 L290 262 L296 226 Z" fill="${C.blue}"/>
    <circle cx="286" cy="212" r="26" fill="${k.accent}"/><circle cx="286" cy="212" r="15" fill="none" stroke="${C.white}" stroke-width="4"/>`,

  money: (k) => `
    ${[0, 1, 2, 3].map((i) => `<rect x="64" y="${200 - i * 24}" width="112" height="16" fill="${C.yellowDark}"/><ellipse cx="120" cy="${200 - i * 24}" rx="56" ry="17" fill="${C.yellow}" stroke="${C.yellowDark}" stroke-width="3"/>`).join('')}
    <circle cx="282" cy="132" r="68" fill="${C.yellow}" stroke="${C.yellowDark}" stroke-width="6"/>
    <circle cx="282" cy="132" r="50" fill="none" stroke="${C.yellowDark}" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round"/>
    ${euro(282, 132, 1)}
    <path d="M104 100 L150 64 L182 82 L236 34" fill="none" stroke="${k.accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M214 32 L240 30 L236 56" fill="none" stroke="${k.accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,

  card: (k) => `
    <g transform="rotate(-9 210 140)"><rect x="104" y="58" width="236" height="148" rx="18" fill="${C.blue}"/></g>
    <rect x="84" y="78" width="240" height="152" rx="18" fill="${C.teal}"/>
    <rect x="84" y="108" width="240" height="30" fill="#000" fill-opacity=".25"/>
    <rect x="110" y="156" width="46" height="36" rx="7" fill="${C.yellow}"/>
    <path d="M110 174 H156 M133 156 V192" stroke="${C.yellowDark}" stroke-width="2.5"/>
    <path d="M180 178 H300 M180 196 H252" stroke="${C.white}" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/>
    <circle cx="326" cy="86" r="46" fill="${k.accent}"/><circle cx="326" cy="86" r="38" fill="none" stroke="${C.white}" stroke-opacity=".7" stroke-width="2.5" stroke-dasharray="3 6" stroke-linecap="round"/>
    ${euro(326, 86, 0.72, C.white)}`,

  steps: (k) => `
    ${[0, 1, 2, 3].map((i) => `<rect x="${60 + i * 74}" y="${234 - 46 * (i + 1)}" width="74" height="${46 * (i + 1)}" fill="${C.teal}" fill-opacity="${[0.3, 0.5, 0.75, 1][i]}"/>`).join('')}
    <path d="M60 234 H356" stroke="${C.teal}" stroke-width="5" stroke-linecap="round"/>
    <path d="M118 138 Q150 112 176 112 M188 106 Q226 84 252 62" fill="none" stroke="${k.accent}" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>
    <circle cx="97" cy="150" r="12" fill="${k.accent}"/><path d="M82 188 Q97 160 112 188 Z" fill="${k.accent}"/>
    <path d="M319 50 V6" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/>
    <path d="M319 8 L366 24 L319 42 Z" fill="${k.accent}"/>`,

  time: (k) => `
    <rect x="62" y="56" width="176" height="168" rx="16" fill="${C.white}" stroke="${C.teal}" stroke-width="5"/>
    <path d="M62 72 Q62 56 78 56 H222 Q238 56 238 72 V98 H62 Z" fill="${C.teal}"/>
    <path d="M102 44 V68 M198 44 V68" stroke="${C.dark}" stroke-width="7" stroke-linecap="round"/>
    ${[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => `<rect x="${86 + col * 50}" y="${116 + row * 36}" width="34" height="24" rx="6" fill="${row === 1 && col === 1 ? k.accent : C.soft}"/>`)).join('')}
    <circle cx="308" cy="170" r="62" fill="${C.white}" stroke="${k.accent}" stroke-width="9"/>
    <path d="M308 170 V128 M308 170 L336 186" stroke="${C.teal}" stroke-width="8" stroke-linecap="round"/><circle cx="308" cy="170" r="6" fill="${C.teal}"/>`,

  jury: (k) => `
    <path d="M232 22 H370 a18 18 0 0 1 18 18 v22 a18 18 0 0 1 -18 18 H322 L300 100 L304 80 H232 a18 18 0 0 1 -18 -18 V40 a18 18 0 0 1 18 -18 Z" fill="${C.soft}" stroke="${C.teal}" stroke-width="4"/>
    <circle cx="260" cy="51" r="6" fill="${C.teal}"/><circle cx="300" cy="51" r="6" fill="${C.teal}"/><circle cx="340" cy="51" r="6" fill="${C.teal}"/>
    ${bust(96, 170, 0.95, C.teal, C.blue)}
    ${bust(196, 170, 0.95, C.teal, C.teal)}
    ${bust(296, 170, 0.95, C.teal, C.blue)}
    <rect x="40" y="166" width="340" height="28" rx="10" fill="${C.dark}"/>
    <rect x="40" y="194" width="340" height="40" rx="6" fill="${C.teal}" fill-opacity=".8"/>
    <circle cx="210" cy="180" r="22" fill="${k.accent}"/>${check(210, 180, 0.9)}`,

  people: (k) => `
    ${bust(92, 190, 1.0, C.blue, C.blue)}
    ${bust(328, 190, 1.0, C.blue, C.blue)}
    ${bust(210, 208, 1.35, C.teal, C.teal)}
    <circle cx="272" cy="96" r="24" fill="${k.accent}" stroke="${C.white}" stroke-width="5"/>${check(272, 96, 0.9)}
    <rect x="48" y="214" width="324" height="12" rx="6" fill="${C.soft}"/>`,

  care: (k) => `
    <polyline points="20,150 118,150 142,116 166,170 196,96 226,150 400,150" fill="none" stroke="${k.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M210 214 C108 150 92 84 144 56 C178 38 204 56 210 80 C216 56 242 38 276 56 C328 84 312 150 210 214 Z" fill="${C.teal}"/>
    <rect x="196" y="88" width="28" height="76" rx="6" fill="${C.white}"/><rect x="172" y="112" width="76" height="28" rx="6" fill="${C.white}"/>`,

  child: (k) => `
    <rect x="62" y="150" width="84" height="84" rx="10" fill="${k.accent}"/>
    <path d="M104 166 L110 184 L130 184 L114 196 L120 216 L104 204 L88 216 L94 196 L78 184 L98 184 Z" fill="${C.white}"/>
    <rect x="146" y="150" width="84" height="84" rx="10" fill="${C.blue}"/><circle cx="188" cy="192" r="24" fill="${C.white}"/>
    <rect x="104" y="66" width="84" height="84" rx="10" fill="${C.yellow}"/><path d="M146 84 L172 132 H120 Z" fill="${C.white}"/>
    <ellipse cx="318" cy="208" rx="58" ry="40" fill="${C.teal}"/>
    <circle cx="318" cy="132" r="48" fill="${C.soft}" stroke="${C.teal}" stroke-width="5"/>
    <path d="M300 86 Q318 62 336 86" fill="none" stroke="${C.teal}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="302" cy="130" r="5.5" fill="${C.dark}"/><circle cx="334" cy="130" r="5.5" fill="${C.dark}"/>
    <path d="M304 148 Q318 162 332 148" fill="none" stroke="${C.dark}" stroke-width="4.5" stroke-linecap="round"/>
    <path transform="translate(-60 -14)" d="M372 62 C352 46 348 28 362 22 C370 19 374 26 376 30 C378 26 384 19 392 22 C406 28 400 46 372 62 Z" fill="${k.accent}"/>`,

  laptop: (k) => `
    <rect x="78" y="34" width="264" height="168" rx="14" fill="${C.teal}"/>
    <rect x="92" y="48" width="236" height="140" rx="8" fill="${C.soft}"/>
    ${[0, 1].flatMap((row) => [0, 1].map((col) => {
      const x = 100 + col * 116; const y = 56 + row * 64;
      const color = [C.blue, C.teal, k.accent, C.blue][row * 2 + col];
      return `<rect x="${x}" y="${y}" width="112" height="60" rx="8" fill="${C.white}"/><circle cx="${x + 56}" cy="${y + 24}" r="11" fill="${color}"/><path d="M${x + 32} ${y + 58} Q${x + 32} ${y + 36} ${x + 56} ${y + 36} Q${x + 80} ${y + 36} ${x + 80} ${y + 58} Z" fill="${color}"/>`;
    })).join('')}
    <path d="M44 214 H376 L360 232 H60 Z" fill="${C.teal}" fill-opacity=".85"/>
    ${[12, 24, 36].map((r) => `<path d="M${r1(372 - r * 0.7071)} ${r1(22 - r * 0.7071)} A${r} ${r} 0 0 1 ${r1(372 + r * 0.7071)} ${r1(22 - r * 0.7071)}" fill="none" stroke="${k.accent}" stroke-width="6" stroke-linecap="round" transform="translate(0 28)"/>`).join('')}
    <circle cx="372" cy="50" r="5" fill="${k.accent}"/>`,

  advisor: (k) => `
    ${bust(112, 222, 1.5, C.soft, C.teal).replace('fill="' + C.soft + '"', 'fill="' + C.soft + '" stroke="' + C.teal + '" stroke-width="4"')}
    <path d="M62 140 A50 50 0 0 1 162 140" fill="none" stroke="${C.dark}" stroke-width="9" stroke-linecap="round" transform="translate(0 -22)"/>
    <rect x="50" y="108" width="20" height="40" rx="8" fill="${k.accent}"/><rect x="154" y="108" width="20" height="40" rx="8" fill="${k.accent}"/>
    <path d="M62 146 Q62 178 98 182" fill="none" stroke="${C.dark}" stroke-width="5" stroke-linecap="round"/>
    <path d="M206 34 H356 a20 20 0 0 1 20 20 v28 a20 20 0 0 1 -20 20 H262 L236 124 L240 102 H206 a20 20 0 0 1 -20 -20 V54 a20 20 0 0 1 20 -20 Z" fill="${C.teal}"/>
    <path d="M214 58 H348 M214 80 H300" stroke="${C.white}" stroke-opacity=".85" stroke-width="7" stroke-linecap="round"/>
    <path d="M232 148 H378 a18 18 0 0 1 18 18 v24 a18 18 0 0 1 -18 18 H368 L384 226 L350 208 H232 a18 18 0 0 1 -18 -18 V166 a18 18 0 0 1 18 -18 Z" fill="${k.accent}"/>
    <circle cx="258" cy="178" r="7" fill="${C.white}"/><circle cx="296" cy="178" r="7" fill="${C.white}"/><circle cx="334" cy="178" r="7" fill="${C.white}"/>`,

  choose: (k) => `
    <rect x="250" y="40" width="130" height="62" rx="12" fill="${C.soft}" stroke="${C.teal}" stroke-width="4"/>
    <rect x="250" y="118" width="130" height="62" rx="12" fill="${C.white}" stroke="${C.teal}" stroke-width="4"/>
    <rect x="250" y="196" width="130" height="50" rx="12" fill="${C.soft}" stroke="${C.teal}" stroke-width="4"/>
    <path d="M270 62 H340 M270 82 H316 M270 140 H340 M270 160 H316 M270 214 H340" stroke="${C.teal}" stroke-opacity=".4" stroke-width="7" stroke-linecap="round"/>
    <path d="M356 150 l7 14 15 2 -11 10 3 15 -14 -8 -14 8 3 -15 -11 -10 15 -2 z" transform="translate(-4 -48) scale(.9)" fill="${k.accent}"/>
    <circle cx="150" cy="116" r="66" fill="${C.soft}" stroke="${C.teal}" stroke-width="15"/>
    <path d="M198 164 L250 220" stroke="${C.teal}" stroke-width="22" stroke-linecap="round"/>
    <path d="M118 118 L140 140 L184 94" fill="none" stroke="${k.accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`,

  checklist: (k) => `
    <rect x="96" y="34" width="228" height="220" rx="18" fill="${C.soft}" stroke="${C.teal}" stroke-width="5"/>
    <rect x="160" y="20" width="100" height="32" rx="12" fill="${C.teal}"/>
    ${[100, 154, 208].map((y, i) => `<rect x="122" y="${y - 20}" width="38" height="38" rx="9" fill="${C.white}" stroke="${C.teal}" stroke-width="4"/>${i < 2 ? check(141, y - 1, 1.1, k.accent, 7) : ''}<path d="M180 ${y - 1} H296" stroke="${C.teal}" stroke-opacity=".4" stroke-width="9" stroke-linecap="round"/>`).join('')}`,

  book: (k) => `
    <circle cx="210" cy="52" r="26" fill="${C.yellow}"/><rect x="198" y="76" width="24" height="14" rx="5" fill="${C.teal}"/>
    <path d="M210 8 V-2 M164 26 L156 18 M256 26 L264 18" stroke="${k.accent}" stroke-width="5" stroke-linecap="round" transform="translate(0 14)"/>
    <path d="M210 104 Q132 76 60 100 V232 Q132 208 210 238 Z" fill="${C.soft}" stroke="${C.teal}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M210 104 Q288 76 360 100 V232 Q288 208 210 238 Z" fill="${C.white}" stroke="${C.teal}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M90 132 Q130 124 180 142 M90 158 Q130 150 180 168 M240 142 Q290 124 330 132 M240 168 Q290 150 330 158" fill="none" stroke="${C.teal}" stroke-opacity=".4" stroke-width="6" stroke-linecap="round"/>`,
};

export const MOTIF_NAMES = Object.keys(MOTIFS);

// --- Assemblage -------------------------------------------------------------------
/**
 * Dessine l'illustration d'un article.
 * @param {{slug:string,title:string,categories?:string[],text?:string}} article
 * @returns {{svg:string, motif:string, secondary:string|null, theme:string}}
 */
export function renderIllustration({ slug, title, categories = [], text = '' }) {
  const seed = hashString(slug);
  const rand = mulberry32(seed);
  const theme = THEMES[seed % THEMES.length];
  const { primary, secondary } = pickMotifs({ title, categories, text });
  const k = { accent: theme.accent, spot: theme.spot };
  const id = `g${seed.toString(36)}`;

  // Cercles décoratifs (position et taille propres à chaque article)
  const circles = [
    { x: 40 + rand() * 90, y: 30 + rand() * 90, r: 70 + rand() * 60, o: theme.decoOpacity, c: theme.deco },
    { x: 560 + rand() * 120, y: 250 + rand() * 100, r: 80 + rand() * 70, o: theme.decoOpacity, c: theme.deco },
    { x: 60 + rand() * 140, y: 290 + rand() * 80, r: 22 + rand() * 20, o: 0.9, c: theme.spot },
    { x: 560 + rand() * 120, y: 20 + rand() * 50, r: 14 + rand() * 14, o: theme.name === 'ocean' ? 0.22 : 0.55, c: theme.name === 'ocean' ? C.white : theme.accent },
  ];

  const badgeX = 566;
  const badgeY = 90;
  const scale = 0.27;
  const badge = secondary
    ? `<clipPath id="${id}c"><circle cx="${badgeX}" cy="${badgeY}" r="48"/></clipPath>` +
      `<g><circle cx="${badgeX}" cy="${badgeY}" r="50" fill="#000" fill-opacity=".1" transform="translate(0 5)"/>` +
      `<circle cx="${badgeX}" cy="${badgeY}" r="50" fill="${C.white}"/>` +
      `<g clip-path="url(#${id}c)"><g transform="translate(${r1(badgeX - 210 * scale)} ${r1(badgeY - 132 * scale)}) scale(${scale})">${MOTIFS[secondary](k)}</g></g>` +
      `<circle cx="${badgeX}" cy="${badgeY}" r="50" fill="none" stroke="${theme.accent}" stroke-width="5"/></g>`
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-hidden="true" focusable="false">` +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.from}"/><stop offset="1" stop-color="${theme.to}"/></linearGradient></defs>` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${id})"/>` +
    circles.map((c) => `<circle cx="${r1(c.x)}" cy="${r1(c.y)}" r="${r1(c.r)}" fill="${c.c}" fill-opacity="${c.o}"/>`).join('') +
    `<rect x="146" y="66" width="420" height="264" rx="28" fill="#000" fill-opacity=".1" transform="translate(0 8)"/>` +
    `<rect x="146" y="60" width="420" height="264" rx="28" fill="${C.white}"/>` +
    `<g transform="translate(146 60)">${MOTIFS[primary](k)}</g>` +
    badge +
    `</svg>`;

  return { svg: svg.replace(/\n\s*/g, ''), motif: primary, secondary, theme: theme.name };
}
