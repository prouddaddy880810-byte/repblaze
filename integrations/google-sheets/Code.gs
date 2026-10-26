/**
 * RepBlaze Leads -> Google Sheet webhook (Apps Script, bound to the "RepBlaze Leads" sheet).
 * Setup: Extensions > Apps Script, paste this file, then Project Settings > Script properties:
 *   SHEETS_WEBHOOK_SECRET = <same value as the Vercel env var>
 * Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 */
var COLUMNS = ['created_at', 'name', 'business_name', 'phone', 'email', 'source', 'notes',
  'audited_business', 'audit_score', 'medium', 'campaign', 'consent_sms', 'consent_email', 'status'];

function doPost(e) {
  var out = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  };
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = PropertiesService.getScriptProperties().getProperty('SHEETS_WEBHOOK_SECRET');
    if (!expected || body.secret !== expected) return out({ ok: false, error: 'unauthorized' });
    var lead = body.lead || {};
    var row = COLUMNS.map(function (k) {
      var v = lead[k];
      if (v === null || v === undefined) return '';
      v = String(v);
      return /^[=+\-@]/.test(v) ? "'" + v : v; // block formula injection
    });
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads').appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: 'server_error' });
  }
}
