/**
 * Google Apps Script lié au Google Sheets « Info VAE – Contacts ».
 * Reçoit les envois de la fonction Netlify (netlify/functions/contact.mjs) et ajoute UNE ligne :
 *   A : Date et heure de réception | B : Prénom | C : Nom | D : Email
 *   E à I : utm_source | utm_medium | utm_campaign | utm_term | utm_content (vides si absents)
 *
 * Installation : voir apps-script/README.md.
 * Le mot de passe partagé (SECRET) n'est PAS dans ce fichier : il est enregistré dans
 * « Paramètres du projet » > « Propriétés du script ».
 */
var SHEET_NAME = 'Feuille 1';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || data.secret !== secret) return reply_({ ok: false, error: 'secret' });

    var firstname = safe_(data.firstname, 80), lastname = safe_(data.lastname, 80), email = safe_(data.email, 254);
    if (!firstname || !lastname || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return reply_({ ok: false, error: 'validation' });

    // Paramètres UTM : facultatifs, jamais bloquants (valeur absente = cellule vide).
    var utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].map(function (k) { return safe_(data[k], 200); });

    lock.waitLock(10000); // évite que deux envois simultanés s'écrasent
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sheet.appendRow([new Date(), firstname, lastname, email].concat(utm));
    var row = sheet.getLastRow();
    sheet.getRange(row, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    SpreadsheetApp.flush();
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: 'erreur' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Nettoie un texte et neutralise les « formules » (=, +, -, @) pour qu'une saisie ne puisse pas s'exécuter dans le tableau.
function safe_(value, max) {
  var s = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
