/* ============================================================
   /api/scan.js — RepBlaze site scanner
   GET /api/scan?url=example.com
   ============================================================ */

const TIMEOUT_MS = 8000;
const THIN_WORD_FLOOR = 200;
const UA =
  "Mozilla/5.0 (compatible; RepBlazeAudit/1.0; +https://repblaze.vercel.app)";

const normalizeUrl = (raw) => {
  let u = String(raw || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    const h = parsed.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h.endsWith(".local") ||
      h.endsWith(".internal") ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^169\.254\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === "0.0.0.0" ||
      h === "[::1]"
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
};

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag, name) => {
  const m = tag.match(
    new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', "i")
  );
  return m ? (m[2] ?? m[3] ?? m[4] ?? "").trim() : "";
};

const metaContent = (html, key, value) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const t of tags) {
    if (attr(t, key).toLowerCase() === value.toLowerCase())
      return attr(t, "content");
  }
  return "";
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Cache-Control", "public, s-maxage=600");

  if (req.method === "OPTIONS") return res.status(200).end();

  const target = normalizeUrl(req.query.url);
  if (!target) return res.status(400).json({ ok: false, error: "INVALID_URL" });

  let html = "";
  let finalUrl = target.href;
  let status = 0;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(target.href, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    clearTimeout(timer);
    status = r.status;
    finalUrl = r.url || target.href;
    const type = r.headers.get("content-type") || "";
    if (!type.includes("html"))
      return res.status(200).json({ ok: false, error: "NOT_HTML", status, finalUrl });
    html = (await r.text()).slice(0, 900000);
  } catch (e) {
    return res.status(200).json({
      ok: false,
      error: e.name === "AbortError" ? "TIMEOUT" : "UNREACHABLE",
      url: target.href,
    });
  }

  if (status >= 400)
    return res.status(200).json({ ok:
