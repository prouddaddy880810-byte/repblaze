/* ============================================================
   /api/lead.js — RepBlaze lead intake (Vercel serverless function)
   POST /api/lead   (JSON body)

   Two independent delivery channels, attempted in parallel:
     1. Store  -> Supabase `leads` table (server-side service-role key)
     2. Notify -> email to Charlie via Resend
   If either succeeds the lead is safe and we return 200.
   Only when BOTH fail do we return an error so the page can show
   the call/text fallback instead of a fake "sent".

   Env (all server-side, never VITE_*):
     SUPABASE_URL                 e.g. https://<ref>.supabase.co
     SUPABASE_SERVICE_ROLE_KEY    service_role secret (bypasses RLS)
     SUPABASE_LEADS_TABLE         optional, default "leads"
     RESEND_API_KEY               Resend API key
     LEAD_NOTIFY_TO               optional, default prouddaddy880810@gmail.com
     LEAD_NOTIFY_FROM             optional, default "RepBlaze Leads <onboarding@resend.dev>"
     LEAD_ALLOWED_ORIGINS         optional, comma list of extra allowed origins
     RESEND_API_URL               test-only override of the Resend endpoint
   ============================================================ */

const DEFAULT_NOTIFY_TO = "prouddaddy880810@gmail.com";
const DEFAULT_NOTIFY_FROM = "RepBlaze Leads <onboarding@resend.dev>";
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 16 * 1024;

/* ---------- best-effort rate limit (per warm instance) ---------- */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map();

export function rateLimited(key, now = Date.now()) {
  const list = (hits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return list.length > RATE_MAX;
}
export function _resetRateLimit() { hits.clear(); }

/* ---------- sanitizing ---------- */
// Strip control chars (keep \n in notes), collapse whitespace, trim, cap length.
const clean = (v, max, { multiline = false } = {}) => {
  if (v === undefined || v === null) return null;
  let s = String(v);
  /* eslint-disable no-control-regex -- stripping control characters is the point */
  s = multiline
    ? s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F\u200B-\u200F\u2028\u2029]/g, "")
    : s.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028\u2029]/g, " ").replace(/\s+/g, " ");
  /* eslint-enable no-control-regex */
  s = s.trim().slice(0, max);
  return s || null;
};

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const UUIDISH_RE = /^[A-Za-z0-9-]{8,80}$/;
const bool = (v) => v === true || v === "true" || v === 1 || v === "1" || v === "on";

const cleanUrl = (v, max = 500) => {
  const s = clean(v, max);
  if (!s) return null;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) ? u.href.slice(0, max) : null;
  } catch {
    return null;
  }
};

/** Validate + normalize a raw body. Returns { lead } or { errors }. */
export function validateLead(body) {
  const b = body && typeof body === "object" ? body : {};
  const errors = {};

  const name = clean(b.name, 120);
  const business = clean(b.business ?? b.business_name, 160);
  const email = clean(b.email, 254)?.toLowerCase() || null;
  const phoneRaw = clean(b.phone, 40);
  const notes = clean(b.notes, 2000, { multiline: true });

  if (!name) errors.name = "Enter your name so we know who to ask for.";

  let phone = null;
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15 || /[^\d\s()+.\-x]/i.test(phoneRaw)) {
      errors.phone = "That phone number doesn't look right.";
    } else phone = phoneRaw;
  }
  if (email && !EMAIL_RE.test(email)) errors.email = "That email address doesn't look right.";
  if (!phoneRaw && !email) errors.contact = "Add a phone or email so we can reach you.";

  const consent_sms = Boolean(phone && bool(b.consent_sms ?? b.consentSms));
  const consent_email = Boolean(email && bool(b.consent_email ?? b.consentEmail));
  if (phone && !consent_sms) errors.consent_sms = "Please confirm we may text you, or remove the phone number.";
  if (email && !errors.email && !consent_email) errors.consent_email = "Please confirm we may email you, or remove the email address.";

  let audit_score = null;
  if (b.audit_score !== undefined && b.audit_score !== null && b.audit_score !== "") {
    const n = Number(b.audit_score);
    if (Number.isInteger(n) && n >= 0 && n <= 100) audit_score = n;
  }

  const sid = clean(b.session_id ?? b.submissionId, 80);
  const session_id = sid && UUIDISH_RE.test(sid) ? sid : null;

  if (Object.keys(errors).length) return { errors };

  return {
    lead: {
      name,
      business_name: business,
      phone,
      email,
      notes,
      source: clean(b.source ?? b.utm_source, 120) || "landing-page",
      medium: clean(b.medium ?? b.utm_medium, 120),
      campaign: clean(b.campaign ?? b.utm_campaign, 160),
      content: clean(b.content ?? b.utm_content, 160),
      term: clean(b.term ?? b.utm_term, 160),
      landing_page: cleanUrl(b.landing_page),
      referrer: cleanUrl(b.referrer),
      audited_business: clean(b.audited_business, 160),
      audit_score,
      consent_sms,
      consent_email,
      session_id,
    },
  };
}

/* ---------- delivery channels ---------- */
async function withTimeout(fetchImpl, url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function storeLead(lead, env, fetchImpl = fetch) {
  const url = env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, reason: "not_configured" };
  const table = env.SUPABASE_LEADS_TABLE || "leads";
  try {
    const r = await withTimeout(fetchImpl, `${url}/rest/v1/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(lead),
    });
    // 409 = same session_id already stored (a retry) -> it is safe.
    if (r.ok || r.status === 409) return { ok: true, duplicate: r.status === 409 };
    const detail = (await r.text().catch(() => "")).slice(0, 300);
    return { ok: false, reason: `http_${r.status}`, detail };
  } catch (e) {
    return { ok: false, reason: e?.name === "AbortError" ? "timeout" : "network", detail: String(e?.message || e).slice(0, 200) };
  }
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function buildEmail(lead) {
  const who = lead.business_name ? `${lead.name} (${lead.business_name})` : lead.name;
  const rows = [
    ["Name", lead.name],
    ["Business", lead.business_name],
    ["Phone", lead.phone ? `${lead.phone}${lead.consent_sms ? " (OK to text)" : ""}` : null],
    ["Email", lead.email ? `${lead.email}${lead.consent_email ? " (OK to email)" : ""}` : null],
    ["Notes", lead.notes],
    ["Audited business", lead.audited_business],
    ["Audit score", lead.audit_score !== null ? `${lead.audit_score}/100` : null],
    ["Source", [lead.source, lead.medium, lead.campaign, lead.content, lead.term].filter(Boolean).join(" / ")],
    ["Landing page", lead.landing_page],
    ["Referrer", lead.referrer],
    ["Submission ID", lead.session_id],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const text = `New RepBlaze lead\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n`;
  const html =
    `<div style="font-family:Arial,sans-serif;color:#2A3038">` +
    `<h2 style="color:#C8321E;margin:0 0 12px">New RepBlaze lead</h2>` +
    `<table cellpadding="6" style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="color:#8A939D;vertical-align:top">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join("") +
    `</table></div>`;
  return { subject: `New RepBlaze lead: ${who}`.slice(0, 200), text, html };
}

export async function notifyLead(lead, env, fetchImpl = fetch) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "not_configured" };
  const to = (env.LEAD_NOTIFY_TO || DEFAULT_NOTIFY_TO).split(",").map((s) => s.trim()).filter(Boolean);
  const { subject, text, html } = buildEmail(lead);
  const payload = { from: env.LEAD_NOTIFY_FROM || DEFAULT_NOTIFY_FROM, to, subject, text, html };
  if (lead.email) payload.reply_to = lead.email;
  try {
    const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
    if (lead.session_id) headers["Idempotency-Key"] = `lead-${lead.session_id}`;
    const r = await withTimeout(fetchImpl, env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (r.ok) return { ok: true };
    const detail = (await r.text().catch(() => "")).slice(0, 300);
    return { ok: false, reason: `http_${r.status}`, detail };
  } catch (e) {
    return { ok: false, reason: e?.name === "AbortError" ? "timeout" : "network", detail: String(e?.message || e).slice(0, 200) };
  }
}

/* ---------- request helpers ---------- */
const clientIp = (req) =>
  String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.headers?.["x-real-ip"] ||
  req.socket?.remoteAddress ||
  "unknown";

function originAllowed(req, env) {
  const origin = req.headers?.origin;
  if (!origin) return true; // same-origin form posts / server-to-server
  try {
    const o = new URL(origin);
    const host = String(req.headers?.host || "");
    if (o.host === host) return true;
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(o.host)) return true;
    if (o.hostname === "repblaze.vercel.app" || /^repblaze(-[a-z0-9-]+)?\.vercel\.app$/.test(o.hostname)) return true;
    const extra = String(env.LEAD_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    return extra.includes(o.origin);
  } catch {
    return false;
  }
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    if (typeof req.body === "string") return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    return req.body;
  }
  // Raw Node request (local harness / dev middleware)
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("too large"), { code: "TOO_LARGE" });
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const send = (res, status, obj) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
};

/* ---------- handler ---------- */
export async function handleLead(req, res, { env = process.env, fetchImpl = fetch, log = console } = {}) {
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") { res.setHeader("Allow", "POST, OPTIONS"); return send(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" }); }
  if (!originAllowed(req, env)) return send(res, 403, { ok: false, error: "FORBIDDEN_ORIGIN" });

  const type = String(req.headers?.["content-type"] || "");
  if (!type.includes("application/json")) return send(res, 415, { ok: false, error: "UNSUPPORTED_MEDIA_TYPE" });
  const len = Number(req.headers?.["content-length"] || 0);
  if (len > MAX_BODY_BYTES) return send(res, 413, { ok: false, error: "TOO_LARGE" });

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return send(res, e?.code === "TOO_LARGE" ? 413 : 400, { ok: false, error: e?.code === "TOO_LARGE" ? "TOO_LARGE" : "INVALID_JSON" });
  }

  // Honeypot: real people never see or fill `website`. Pretend success, drop it.
  if (clean(body?.website, 200) || clean(body?.company_url, 200)) {
    log.warn?.("[lead] honeypot tripped; dropped");
    return send(res, 200, { ok: true });
  }

  if (rateLimited(clientIp(req))) {
    res.setHeader("Retry-After", "600");
    return send(res, 429, { ok: false, error: "RATE_LIMITED" });
  }

  const { lead, errors } = validateLead(body);
  if (errors) return send(res, 422, { ok: false, error: "VALIDATION", fields: errors });

  const [stored, notified] = await Promise.all([storeLead(lead, env, fetchImpl), notifyLead(lead, env, fetchImpl)]);

  if (!stored.ok) log.error?.("[lead] storage failed:", stored.reason, stored.detail || "");
  if (!notified.ok) log.error?.("[lead] email failed:", notified.reason, notified.detail || "");

  if (stored.ok || notified.ok) {
    return send(res, 200, { ok: true, stored: stored.ok, notified: notified.ok });
  }

  // Both channels down: keep a last-resort copy in the function log so the lead can be recovered.
  log.error?.("[lead] BOTH CHANNELS FAILED — unsaved lead follows:", JSON.stringify(lead));
  return send(res, 502, { ok: false, error: "DELIVERY_FAILED" });
}

export default function handler(req, res) {
  return handleLead(req, res);
}
