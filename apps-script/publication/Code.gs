/**
 * INFO VAE — PASSERELLE DE PUBLICATION (Google Apps Script lié au Sheet « Suivi article site info VAE »)
 *
 * Ce script permet au robot GitHub Actions de :
 *   - lire le Sheet de suivi                        (action readSheet)
 *   - lire le texte des Google Docs liés au Sheet   (action exportDoc, LECTURE SEULE)
 *   - passer une ligne à « Publié » avec sa date    (action markPublished, colonnes État et Date uniquement)
 *
 * SÉCURITÉ
 *   - Aucun secret dans ce code : le secret partagé est dans « Propriétés du script » (INFO_VAE_SECRET).
 *   - Chaque requête est signée en HMAC-SHA256 (le secret ne voyage jamais), valable 5 minutes, à usage unique.
 *   - Seules 4 actions existent. Le Sheet est celui auquel le script est lié (pas d'identifiant fourni par l'appelant).
 *   - exportDoc refuse tout Doc qui n'est pas lié dans la colonne « Fichier » du Sheet.
 *   - markPublished vérifie que la ligne n'a pas changé (titre, Doc, état « à intégrer ») avant d'écrire.
 *   - Aucun contenu de requête, aucun secret n'est écrit dans les journaux.
 * Mode d'emploi : apps-script/publication/README.md
 */

var VERSION = '1.2';
var TIMEZONE = 'Europe/Paris';
var MAX_AGE_SECONDS = 300;
var MAX_ROWS = 2000;
var STATUS_TO_INTEGRATE = 'à intégrer';
var STATUS_PUBLISHED = 'Publié';
var ACTIONS = ['ping', 'readSheet', 'exportDoc', 'markPublished'];

// ------------------------------------------------------------------ point d'entrée

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '');
    var secret = PropertiesService.getScriptProperties().getProperty('INFO_VAE_SECRET');
    if (!secret || PropertiesService.getScriptProperties().getProperty('DISABLED') === '1') return reply_({ ok: false, error: 'unavailable' });
    if (typeof body.payload !== 'string' || typeof body.sig !== 'string') return reply_({ ok: false, error: 'unauthorized' });
    var expected = toHex_(Utilities.computeHmacSha256Signature(body.payload, secret));
    if (!safeEqual_(expected, body.sig.toLowerCase())) return reply_({ ok: false, error: 'unauthorized' });
    var req = JSON.parse(body.payload);
    var age = Math.abs(Date.now() / 1000 - Number(req.ts));
    if (!(age <= MAX_AGE_SECONDS)) return reply_({ ok: false, error: 'expired' });
    if (typeof req.nonce !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(req.nonce)) return reply_({ ok: false, error: 'bad_request' });
    var cache = CacheService.getScriptCache();
    if (cache.get('n_' + req.nonce)) return reply_({ ok: false, error: 'replay' });
    cache.put('n_' + req.nonce, '1', 600);
    if (ACTIONS.indexOf(req.action) < 0) return reply_({ ok: false, error: 'bad_request' });
    var params = req.params || {};
    var data;
    if (req.action === 'ping') data = { version: VERSION, sheetId: SpreadsheetApp.getActiveSpreadsheet().getId() };
    else if (req.action === 'readSheet') data = { rows: readSheet_() };
    else if (req.action === 'exportDoc') data = { markdown: exportDoc_(params) };
    else data = markPublished_(params);
    return reply_({ ok: true, data: data });
  } catch (err) {
    // Message court, jamais le contenu de la requête ni un secret.
    return reply_({ ok: false, error: 'failed', detail: String(err && err.message ? err.message : err).slice(0, 200) });
  }
}

function doGet() {
  return reply_({ ok: false, error: 'post_only' });
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------ outils de sécurité

function toHex_(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += ('0' + (bytes[i] & 0xff).toString(16)).slice(-2);
  return out;
}

/** Comparaison en temps constant (ne s'arrête pas au premier caractère différent). */
function safeEqual_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function norm_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function clean_(s) {
  return String(s == null ? '' : s).normalize('NFC').replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------------ accès au Sheet (celui du script)

function sheet_() {
  var props = PropertiesService.getScriptProperties();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tab = props.getProperty('SHEET_TAB') || 'Feuille 1';
  var sheet = ss.getSheetByName(tab);
  if (!sheet) throw new Error('onglet introuvable');
  return sheet;
}

function docIdFromUrl_(url) {
  var m = /\/d\/([A-Za-z0-9_-]{20,})/.exec(url || '') || /[?&]id=([A-Za-z0-9_-]{20,})/.exec(url || '');
  return m ? m[1] : null;
}

function linkOf_(rich, formula, text) {
  var url = rich ? rich.getLinkUrl() : null;
  if (!url && rich && rich.getRuns) {
    var runs = rich.getRuns();
    for (var i = 0; i < runs.length && !url; i++) url = runs[i].getLinkUrl();
  }
  if (!url && formula) {
    var m = /HYPERLINK\(\s*"([^"]+)"/i.exec(formula);
    if (m) url = m[1];
  }
  if (!url && /^https?:\/\//.test(text || '')) url = text;
  return url || null;
}

function readSheet_() {
  var sheet = sheet_();
  var lastRow = Math.min(sheet.getLastRow(), MAX_ROWS);
  var lastCol = Math.min(sheet.getLastColumn(), 26);
  if (lastRow < 1 || lastCol < 1) return [];
  var range = sheet.getRange(1, 1, lastRow, lastCol);
  var texts = range.getDisplayValues();
  var rich = range.getRichTextValues();
  var formulas = range.getFormulas();
  var rows = [];
  for (var r = 0; r < lastRow; r++) {
    var cells = [];
    for (var c = 0; c < lastCol; c++) cells.push({ text: texts[r][c], link: linkOf_(rich[r][c], formulas[r][c], texts[r][c]) });
    rows.push({ row: r + 1, cells: cells });
  }
  fillMissingLinks_(rows);
  return rows;
}

function colLetter_(index) {
  var n = index + 1, s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function attrs_(tag) {
  var out = {}, re = /([\w:]+)="([^"]*)"/g, m;
  while ((m = re.exec(tag))) out[m[1]] = m[2];
  return out;
}

function unescapeXml_(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/**
 * Les « puces intelligentes » (smart chips) de fichier Google ne donnent pas leur adresse à getRichTextValues().
 * Quand une cellule de la colonne « Fichier » a du texte mais pas de lien, on lit les liens dans l'export Excel du
 * Sheet (Drive, lecture seule, même autorisation drive.readonly) : { 'G8': 'https://docs.google.com/…' }.
 */
function xlsxLinks_() {
  var id = SpreadsheetApp.getActiveSpreadsheet().getId();
  var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '/export?mimeType=' + encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') + '&supportsAllDrives=true';
  var res = UrlFetchApp.fetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return {};
  var files = {};
  Utilities.unzip(res.getBlob()).forEach(function (b) { files[b.getName()] = b; });
  var text = function (name) { return files[name] ? files[name].getDataAsString('UTF-8') : ''; };
  var tab = PropertiesService.getScriptProperties().getProperty('SHEET_TAB') || 'Feuille 1';
  var rid = null, tags = text('xl/workbook.xml').match(/<sheet [^>]*>/g) || [];
  tags.forEach(function (t) { var a = attrs_(t); if (unescapeXml_(a.name) === tab) rid = a['r:id']; });
  if (!rid) return {};
  var target = null;
  (text('xl/_rels/workbook.xml.rels').match(/<Relationship [^>]*>/g) || []).forEach(function (t) { var a = attrs_(t); if (a.Id === rid) target = a.Target; });
  if (!target) return {};
  var sheetPath = target.charAt(0) === '/' ? target.slice(1) : 'xl/' + target;
  var relsPath = sheetPath.replace(/([^\/]+)$/, '_rels/$1.rels');
  var targets = {};
  (text(relsPath).match(/<Relationship [^>]*>/g) || []).forEach(function (t) { var a = attrs_(t); targets[a.Id] = unescapeXml_(a.Target); });
  var map = {};
  (text(sheetPath).match(/<hyperlink [^>]*>/g) || []).forEach(function (t) { var a = attrs_(t); if (a.ref && targets[a['r:id']]) map[a.ref] = targets[a['r:id']]; });
  return map;
}

function fillMissingLinks_(rows) {
  var col;
  try { col = columns_(rows); } catch (e) { return; }
  var missing = rows.filter(function (r) { var cell = r.cells[col.file]; return r.row > col.headerRow && cell && cell.text && !cell.link; });
  if (!missing.length) return;
  var map = xlsxLinks_();
  missing.forEach(function (r) { var link = map[colLetter_(col.file) + r.row]; if (link) r.cells[col.file].link = link; });
}

/** Colonnes repérées par leur NOM (comme côté robot), pas par leur position. */
function columns_(rows) {
  var wanted = { title: 'titre', status: 'etat', date: 'date de publication', file: 'fichier' };
  var header = null;
  for (var i = 0; i < rows.length && !header; i++) {
    var names = rows[i].cells.map(function (c) { return norm_(c.text); });
    if (names.indexOf('titre') >= 0 && names.indexOf('etat') >= 0) header = { row: rows[i].row, names: names };
  }
  if (!header) throw new Error('en-têtes introuvables');
  var col = {};
  for (var k in wanted) {
    var idx = header.names.indexOf(wanted[k]);
    if (idx < 0) throw new Error('colonne introuvable : ' + wanted[k]);
    col[k] = idx;
  }
  col.headerRow = header.row;
  return col;
}

function allowedDocIds_(rows, col) {
  var ids = {};
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row <= col.headerRow) continue;
    var cell = rows[i].cells[col.file];
    var id = cell ? docIdFromUrl_(cell.link) : null;
    if (id) ids[id] = true;
  }
  return ids;
}

// ------------------------------------------------------------------ actions

/** Export Markdown d'un Google Doc : LECTURE SEULE (scope drive.readonly), Doc obligatoirement lié dans le Sheet. */
function exportDoc_(params) {
  var id = String(params.docId || '');
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) throw new Error('docId invalide');
  var rows = readSheet_();
  if (!allowedDocIds_(rows, columns_(rows))[id]) throw new Error('Doc non référencé dans le Sheet');
  var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '/export?mimeType=' + encodeURIComponent('text/markdown') + '&supportsAllDrives=true';
  var res = UrlFetchApp.fetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code !== 200) throw new Error('Doc inaccessible (HTTP ' + code + ')');
  return res.getContentText();
}

/** Écrit « Publié » et la date dans la ligne indiquée, seulement si elle est restée telle que le robot l'a lue. */
function markPublished_(params) {
  var row = Number(params.row);
  if (!(row >= 2 && row <= MAX_ROWS && Math.floor(row) === row)) throw new Error('ligne invalide');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(params.date || ''))) throw new Error('date invalide');
  var date = Utilities.parseDate(params.date, TIMEZONE, 'yyyy-MM-dd');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rows = readSheet_();
    var col = columns_(rows);
    var line = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].row === row) line = rows[i];
    if (!line || row <= col.headerRow) throw new Error('ligne introuvable');
    var title = clean_(line.cells[col.title].text);
    var docId = docIdFromUrl_(line.cells[col.file].link);
    var status = clean_(line.cells[col.status].text);
    if (title !== clean_(params.title) || docId !== String(params.docId || '')) throw new Error('la ligne a changé');
    if (status === STATUS_PUBLISHED) return { row: row, status: status, alreadyPublished: true };
    if (status !== STATUS_TO_INTEGRATE) throw new Error('état inattendu : ' + status);
    var sheet = sheet_();
    sheet.getRange(row, col.status + 1).setValue(STATUS_PUBLISHED);
    var dateCell = sheet.getRange(row, col.date + 1);
    dateCell.setValue(date);
    dateCell.setNumberFormat('dd/MM/yyyy');
    SpreadsheetApp.flush();
    return { row: row, status: sheet.getRange(row, col.status + 1).getDisplayValue(), alreadyPublished: false };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------ installation (menu du Sheet)

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Info VAE').addItem('Générer ou renouveler le jeton du robot', 'generateSecret').addItem('Autoriser le script', 'authorize').addToUi();
}

/** À lancer une fois : déclenche la fenêtre d'autorisation de Google (lecture Sheet + lecture Docs). */
function authorize() {
  sheet_().getLastRow();
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=kind', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  SpreadsheetApp.getUi().alert('Autorisation accordée. Vous pouvez déployer le script.');
}

/** Crée un secret aléatoire, le range dans les propriétés du script, et l'affiche UNE SEULE FOIS à l'écran (jamais dans les journaux). */
function generateSecret() {
  var ui = SpreadsheetApp.getUi();
  var bytes = [];
  for (var i = 0; i < 4; i++) bytes = bytes.concat(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now() + Math.random()));
  var secret = toHex_(bytes);
  PropertiesService.getScriptProperties().setProperty('INFO_VAE_SECRET', secret);
  ui.alert('Jeton du robot (affiché une seule fois)', 'Copiez-le maintenant dans le secret GitHub APPS_SCRIPT_SECRET :\n\n' + secret + '\n\nNe le collez nulle part ailleurs. Générer un nouveau jeton annule l’ancien.', ui.ButtonSet.OK);
}
