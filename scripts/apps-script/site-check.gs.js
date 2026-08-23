/**
 * RepBlaze site-check proxy — paste this into the SAME Apps Script project
 * that already serves LEAD_ENDPOINT (Extensions > Apps Script from the
 * Sheet, or script.google.com). It only adds a doGet(e) handler, which is
 * a separate entry point from the doPost(e) the lead form already uses —
 * nothing about lead capture changes.
 *
 * Setup:
 *   1. Paste this file's contents into a new .gs file in that project
 *      (or add doGet/jsonOut to an existing file — Apps Script only runs
 *      one global doGet across the whole project, so if one already
 *      exists, merge instead of pasting a duplicate).
 *   2. Deploy > Manage deployments > (the existing web app) > Edit >
 *      New version > Deploy. Reusing the existing deployment keeps the
 *      same /exec URL, so LEAD_ENDPOINT doesn't need to change.
 *   3. Copy that /exec URL into SITE_CHECK_ENDPOINT in src/App.jsx.
 *
 * Call shape:  GET {WEB_APP_URL}?url=https%3A%2F%2Fexample.com
 * Returns JSON: { ok, status, https, title, hasQuoteForm, hasPhoneText,
 *                 hasTrustKeyword, mobileFriendly, navLinkCount, fetchMs }
 * or, on failure: { ok: false, reason }
 *
 * Deliberately simple: regex scans over the raw HTML, no DOM parser, no
 * external calls beyond the one UrlFetchApp.fetch. Cheap, fast, and the
 * try/catch guarantees it always returns valid JSON instead of throwing —
 * the client already treats any ok:false the same way (manual-review
 * prompt), so failure here degrades gracefully rather than breaking
 * anything upstream.
 */
function doGet(e) {
  const target = e.parameter.url;
  if (!target) return jsonOut({ ok: false, reason: "missing_url" });

  const started = Date.now();
  try {
    const res = UrlFetchApp.fetch(target, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      // Apps Script's default UA gets blocked by a lot of sites outright.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RepBlazeAudit/1.0; +https://repblaze.example)" },
    });

    const status = res.getResponseCode();
    if (status >= 400) return jsonOut({ ok: false, reason: "http_" + status });

    const html = res.getContentText().slice(0, 200000); // cap — some sites are huge
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const navLinkCount = (html.match(/<a\s[^>]*href=/gi) || []).length;

    return jsonOut({
      ok: true,
      status,
      https: target.indexOf("https://") === 0,
      title: titleMatch ? titleMatch[1].trim().slice(0, 120) : "",
      hasQuoteForm: /<form[\s\S]{0,4000}?(quote|estimate|rfq|request)[\s\S]{0,4000}?<\/form>/i.test(html)
        || /type=["']file["']/i.test(html),
      hasPhoneText: /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/.test(html),
      hasTrustKeyword: /(iso\s?9001|certified|licensed|guarantee|warranty|accredited)/i.test(html),
      mobileFriendly: /<meta[^>]*name=["']viewport["']/i.test(html),
      navLinkCount,
      fetchMs: Date.now() - started,
    });
  } catch (err) {
    return jsonOut({ ok: false, reason: "fetch_failed", detail: String(err).slice(0, 200) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
