// Point d'entrée de l'automatisation :  node scripts/publish/run.mjs [--dry-run] [--selfcheck]
//   (sans option)  publication réelle des lignes « à intégrer »
//   --dry-run      lit le Sheet et les Docs, valide, annonce ce qui serait publié, ne modifie RIEN
//   --selfcheck    compare la conversion des Docs de 5 articles déjà publiés à leur contenu actuel (test de lecture, aucune écriture)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGoogleClient, parseCredentials } from './google.mjs';
import { createAppsScriptClient } from './appsscript.mjs';
import { runPublication, parseSheet, columnLetter, parisDate } from './pipeline.mjs';
import { parseDocMarkdown } from '../../src/lib/docToBlocks.js';

export const DEFAULTS = {
  sheetId: '1LlVOvyMw3hoJ18ZUe58JjqcV42eJ30gQeL_Ow2oEjeQ',
  tab: 'Feuille 1',
  siteUrl: 'https://info-vae.netlify.app',
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sh(cmd, args, opts = {}) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // sinon un `npm test` lancé depuis un test serait ignoré
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env, ...opts });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
/** Pour `npm test` : les lignes « not ok » et leur message ; sinon la fin de la sortie. */
const failureLines = (text) => {
  const lines = text.split('\n');
  const picked = lines.filter((l, i) => /^\s*not ok/.test(l) || (/^\s+error:/.test(l)) || (i > 0 && /^\s+error:/.test(lines[i - 1]) ));
  return (picked.length ? picked : lines.slice(-15)).slice(0, 30).join('\n');
};
const tail = (text, n = 15) => text.trim().split('\n').slice(-n).join('\n');

export function realRepo(rootDir = root) {
  return {
    async existing() {
      return JSON.parse(execFileSync('node', ['scripts/publish/list-existing.mjs', rootDir], { cwd: rootDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    },
    async write({ auto, targets, alts }) {
      fs.writeFileSync(path.join(rootDir, 'src/data/autoArticles.js'),
        "// ARTICLES PUBLIÉS PAR L'AUTOMATISATION QUOTIDIENNE (scripts/publish/run.mjs).\n// Fichier géré par le robot : il y ajoute un article quand une ligne du Sheet passe à « à intégrer ».\n// Même structure que src/data/sheetArticlesLot2.js. Ne pas modifier à la main sans raison.\nexport const autoArticles = " + JSON.stringify(auto, null, 2) + ';\n');
      fs.writeFileSync(path.join(rootDir, 'src/data/autoLinkTargets.js'),
        "// EXPRESSIONS DE MAILLAGE DES ARTICLES PUBLIÉS PAR L'AUTOMATISATION (voir src/data/internalLinks.js).\n// Le robot y ajoute le titre de chaque nouvel article ; vous pouvez compléter avec d'autres expressions naturelles.\nexport const autoLinkTargets = " + JSON.stringify(targets, null, 2) + ';\n');
      fs.writeFileSync(path.join(rootDir, 'src/data/autoImageAlt.js'),
        "// TEXTES ALTERNATIFS PROVISOIRES des articles publiés par l'automatisation (scripts/publish/run.mjs).\n// Ils servent tant qu'aucune photo n'existe pour l'article. QUAND VOUS FOURNISSEZ LA PHOTO : écrivez dans\n// src/data/imageAlt.js une phrase qui DÉCRIT la photo (elle remplace celle-ci, voir docs/photos-brief.md).\nexport const autoPhotoAlt = " + JSON.stringify(alts ?? {}, null, 2) + ';\n');
    },
    async images() {
      const r = sh('node', ['scripts/generate-images.mjs'], { cwd: rootDir });
      if (!r.ok) throw new Error(`génération des illustrations : ${tail(r.out, 5)}`);
    },
    async check() {
      for (const [cmd, args] of [['npm', ['test']], ['node', ['scripts/generate-images.mjs', '--check']], ['npm', ['run', 'build']]]) {
        if (process.env.SKIP_BUILD === '1' && args.includes('build')) continue;
        const r = sh(cmd, args, { cwd: rootDir });
        if (!r.ok) return { ok: false, detail: `${cmd} ${args.join(" ")} → ${failureLines(r.out)}` };
      }
      return { ok: true };
    },
    async commit(message) {
      sh('git', ['add', '-A', 'src', 'public'], { cwd: rootDir });
      const r = sh('git', ['commit', '-m', message], { cwd: rootDir });
      if (!r.ok) throw new Error(`git commit : ${tail(r.out, 5)}`);
    },
    async reset() {
      sh('git', ['reset', '--hard', 'HEAD'], { cwd: rootDir });
      sh('git', ['clean', '-fd', '--', 'src', 'public'], { cwd: rootDir });
    },
    async push() {
      let last = '';
      for (let i = 1; i <= 3; i++) {
        const pull = sh('git', ['pull', '--rebase', 'origin', 'main'], { cwd: rootDir });
        const push = pull.ok ? sh('git', ['push', 'origin', 'HEAD:main'], { cwd: rootDir }) : pull;
        if (push.ok) return;
        last = tail(push.out, 4);
        await sleep(3000 * i);
      }
      throw new Error(last);
    },
  };
}

const decode = (s) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const squash = (s) => decode(s).replace(/\s+/g, ' ').trim();

/** Vérifie que la page est en ligne (HTTP 200) et contient bien le titre de l'article. Réessaie jusqu'à la fin du déploiement. */
export function realSite({ siteUrl, fetchImpl = fetch, sleep: wait = sleep, timeoutMs = 20 * 60_000, intervalMs = 30_000, nowMs = () => Date.now() }) {
  return {
    async verify(slug, title) {
      const started = nowMs();
      let detail = 'aucune tentative';
      while (true) {
        try {
          const res = await fetchImpl(`${siteUrl.replace(/\/$/, '')}/${slug}?verif=${nowMs()}`, { headers: { 'cache-control': 'no-cache' }, redirect: 'follow' });
          const html = res.ok ? await res.text() : '';
          if (res.ok && squash(html).includes(squash(title))) return { ok: true, detail: 'page accessible, titre présent' };
          detail = res.ok ? 'page accessible mais titre introuvable' : `HTTP ${res.status}`;
        } catch (e) { detail = `réseau : ${e.message}`; }
        if (nowMs() - started + intervalMs > timeoutMs) return { ok: false, detail: `${detail} après ${Math.round((nowMs() - started) / 60000)} min d’attente` };
        await wait(intervalMs);
      }
    },
  };
}

/** Choisit l'accès Google : passerelle Apps Script si ses deux secrets existent, sinon compte de service. */
export function createBackend(env, config) {
  if (env.APPS_SCRIPT_URL && env.APPS_SCRIPT_SECRET) {
    const client = createAppsScriptClient({ url: env.APPS_SCRIPT_URL, secret: env.APPS_SCRIPT_SECRET });
    return { kind: 'apps-script', ...client, async readSheet() { return client.readSheet(); } };
  }
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const google = createGoogleClient({ credentials: parseCredentials(env.GOOGLE_SERVICE_ACCOUNT_JSON) });
    return {
      kind: 'service-account',
      readSheet: () => google.readSheet(config.sheetId, config.tab),
      exportDocMarkdown: (id) => google.exportDocMarkdown(id),
      async markPublishedCells(row, serial, col) {
        await google.setValues(config.sheetId, `${config.tab}!${columnLetter(col.status)}${row}`, [['Publié']]);
        await google.setValues(config.sheetId, `${config.tab}!${columnLetter(col.date)}${row}`, [[serial]]);
      },
    };
  }
  return null;
}

export function sheetAdapter({ backend }) {
  const read = () => backend.readSheet();
  return {
    read,
    async recheck(rowNumber) {
      const { items } = parseSheet(await read());
      const it = items.find((i) => i.row === rowNumber);
      if (!it) throw new Error(`ligne ${rowNumber} introuvable`);
      return { title: it.title, status: String(it.status).trim(), docId: it.docId };
    },
    async markPublished(rowNumber, serial, col, { item, date } = {}) {
      if (backend.kind === 'apps-script') await backend.markPublished({ row: rowNumber, title: item.title, docId: item.docId, date });
      else await backend.markPublishedCells(rowNumber, serial, col);
    },
  };
}

function writeSummary(title, lines) {
  const text = `## ${title}\n\n${lines.join('\n')}\n`;
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const selfcheck = args.includes('--selfcheck');
  const config = {
    sheetId: process.env.SHEET_ID || DEFAULTS.sheetId,
    tab: process.env.SHEET_TAB || DEFAULTS.tab,
    siteUrl: process.env.SITE_URL || DEFAULTS.siteUrl,
  };
  const backend = createBackend(process.env, config);
  if (!backend) {
    writeSummary('Publication automatique — configuration manquante', ['Aucun accès Google configuré : définissez les secrets GitHub `APPS_SCRIPT_URL` et `APPS_SCRIPT_SECRET` (voir apps-script/publication/README.md), ou `GOOGLE_SERVICE_ACCOUNT_JSON`.']);
    process.exit(1);
  }
  console.log(`Accès Google : ${backend.kind}`);
  const repo = realRepo();

  if (selfcheck) {
    const existing = await repo.existing();
    const sample = existing.all.filter((a) => a.docId && a.row).slice(0, 5);
    const lines = [];
    let bad = 0;
    for (const a of sample) {
      try {
        const { blocks } = parseDocMarkdown(await backend.exportDocMarkdown(a.docId));
        const same = JSON.stringify(blocks) === JSON.stringify(a.content);
        if (!same) bad++;
        lines.push(`- ${same ? '✅' : '⚠️'} /${a.slug} : ${blocks.length} blocs lus dans le Doc, ${a.content.length} dans le site${same ? ' (identiques)' : ' (différences : le Doc a peut-être été modifié depuis l’intégration)'}`);
      } catch (e) { bad++; lines.push(`- ❌ /${a.slug} : ${e.message}`); }
    }
    writeSummary('Test de lecture des Google Docs', lines);
    process.exit(bad ? 1 : 0);
  }

  const deps = {
    sheet: sheetAdapter({ backend }),
    docs: { exportMarkdown: (id) => backend.exportDocMarkdown(id) },
    repo,
    site: realSite({ siteUrl: config.siteUrl }),
  };
  const report = await runPublication({ deps, dryRun, today: parisDate() });
  writeSummary(dryRun ? 'Publication automatique — SIMULATION' : 'Publication automatique', [
    `Résultat : ${report.summary}`,
    '',
    ...report.results.map((r) => `- ${r.outcome === 'publié' ? '✅' : r.outcome === 'erreur' ? '❌' : 'ℹ️'} ligne ${r.row} « ${r.title} » : ${r.detail}`),
  ]);
  process.exit(report.results.some((r) => r.outcome === 'erreur') ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    writeSummary('Publication automatique — erreur', [`❌ ${e.message}`]);
    process.exit(1);
  });
}
