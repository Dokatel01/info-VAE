// Conversion du texte d'un Google Doc (export Markdown) en blocs de contenu du site.
// Même règles que celles utilisées pour l'intégration manuelle des articles :
//   - le titre du Doc (1re ligne) est exclu : il est repris du Sheet ;
//   - le plus haut niveau de titre devient h2, les niveaux inférieurs h3 ;
//   - puces, listes numérotées, séparateurs ; le texte est transcrit tel quel (aucune réécriture).
const unescapeMd = (s) => s.replace(/\\([\\`*_{}\[\]()#+\-.!>|~])/g, '$1');
const clean = (s) => unescapeMd(s).replace(/\s+$/g, '').replace(/^\s+/, '');

export function parseDocMarkdown(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) throw new Error('Document vide');
  const titleLine = lines[i].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
  const rest = lines.slice(i + 1).filter((l) => l.trim() !== '');
  const levels = rest.filter((l) => /^#+\s/.test(l)).map((l) => l.match(/^#+/)[0].length);
  const minLevel = levels.length ? Math.min(...levels) : 2;
  const blocks = [];
  let cur = null;
  const flush = () => { cur = null; };
  let lastMarker = null;
  for (const raw of rest) {
    if (/^-{3,}$/.test(raw.trim()) || /^(\*\s*){3,}$/.test(raw.trim())) { flush(); blocks.push({ type: 'hr' }); lastMarker = null; continue; }
    const h = raw.match(/^(#+)\s+(.*)$/);
    if (h) { flush(); blocks.push({ type: h[1].length === minLevel ? 'h2' : 'h3', text: clean(h[2]).replace(/\*\*/g, '') }); lastMarker = null; continue; }
    const b = raw.match(/^\s{0,2}[-*+]\s+(.*)$/);
    if (b) {
      if (!cur || cur.type !== 'ul') { cur = { type: 'ul', items: [] }; blocks.push(cur); }
      cur.items.push(clean(b[1])); lastMarker = null; continue;
    }
    if (/^\s{4,}\S/.test(raw) && cur && cur.type === 'ul') { cur.items[cur.items.length - 1] += '\n' + clean(raw); continue; }
    const n = raw.match(/^\d+[.)]\s+(.*)$/);
    if (n) {
      if (!cur || cur.type !== 'ol') { cur = { type: 'ol', items: [] }; blocks.push(cur); }
      cur.items.push(clean(n[1])); lastMarker = null; continue;
    }
    flush();
    const text = clean(raw);
    const marker = /^(✔|⏳|🚀|🔄|👉)/u.exec(text)?.[1] ?? null;
    const prev = blocks[blocks.length - 1];
    if (marker && marker === lastMarker && prev?.type === 'p') prev.text += '\n' + text;
    else blocks.push({ type: 'p', text });
    lastMarker = marker;
  }
  return { titleLine, blocks };
}
