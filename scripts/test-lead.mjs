// Local test harness for api/lead.js. No network: Supabase + Resend are mocked.
// Run: npm run test:lead
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { handleLead, _resetRateLimit } from "../api/lead.js";

const GOOD = {
  name: "Jane Smith",
  business: "Main Street Auto Repair <b>",
  phone: "(816) 555-0142",
  email: "Jane@Example.com",
  notes: "Need help\nwith reviews",
  consent_sms: true,
  consent_email: true,
  source: "audit-tool",
  audit_score: 62,
  session_id: "3f6c1a7e-1111-4222-8333-944445555666",
  landing_page: "https://repblaze.vercel.app/",
  website: "",
};

let ipCounter = 0;
function makeReq(body, { method = "POST", headers = {}, raw } = {}) {
  const payload = raw ?? (body === undefined ? "" : JSON.stringify(body));
  const req = Readable.from(payload ? [Buffer.from(payload)] : []);
  req.method = method;
  req.headers = { "content-type": "application/json", host: "localhost:5173", "x-forwarded-for": `10.0.0.${++ipCounter}`, ...headers };
  return req;
}
function makeRes() {
  const res = { statusCode: 200, headers: {}, body: "" };
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  res.end = (s = "") => { res.body = s; res.json = s ? JSON.parse(s) : null; };
  return res;
}
const quietLog = () => { const l = { lines: [] }; l.warn = l.error = (...a) => l.lines.push(a.join(" ")); return l; };

function mockFetch({ supabase = 201, resend = 200, throwOn } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : null });
    if (throwOn && url.includes(throwOn)) throw new TypeError("fetch failed (mock ENOTFOUND)");
    const status = url.includes("supabase") ? supabase : resend;
    return new Response(status === 201 ? "" : JSON.stringify({ id: "mock" }), { status });
  };
  fn.calls = calls;
  return fn;
}
const ENV_BOTH = {
  SUPABASE_URL: "https://mockproj.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-mock",
  RESEND_API_KEY: "re_mock",
};

async function run(body, env, fetchImpl, opts) {
  const res = makeRes();
  const log = quietLog();
  await handleLead(makeReq(body, opts), res, { env, fetchImpl, log });
  return { res, log };
}

beforeEach(() => _resetRateLimit());

test("env vars unset -> 502 DELIVERY_FAILED, no fetches, lead kept in log", async () => {
  const f = mockFetch();
  const { res, log } = await run(GOOD, {}, f);
  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.json, { ok: false, error: "DELIVERY_FAILED" });
  assert.equal(f.calls.length, 0);
  assert.ok(log.lines.some((l) => l.includes("BOTH CHANNELS FAILED") && l.includes("Jane Smith")));
});

test("both configured and healthy -> 200 stored+notified, correct upstream requests", async () => {
  const f = mockFetch();
  const { res } = await run(GOOD, ENV_BOTH, f);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json, { ok: true, stored: true, notified: true });

  const sb = f.calls.find((c) => c.url.includes("supabase"));
  assert.equal(sb.url, "https://mockproj.supabase.co/rest/v1/leads");
  assert.equal(sb.init.headers.Authorization, "Bearer service-role-mock");
  assert.equal(sb.body.email, "jane@example.com");
  assert.equal(sb.body.business_name, "Main Street Auto Repair <b>");
  assert.equal(sb.body.notes, "Need help\nwith reviews");
  assert.equal(sb.body.audit_score, 62);
  assert.equal(sb.body.consent_sms, true);
  assert.ok(!("website" in sb.body));

  const rs = f.calls.find((c) => c.url.includes("resend"));
  assert.deepEqual(rs.body.to, ["prouddaddy880810@gmail.com"]);
  assert.equal(rs.body.reply_to, "jane@example.com");
  assert.equal(rs.init.headers["Idempotency-Key"], "lead-" + GOOD.session_id);
  assert.ok(rs.body.html.includes("Main Street Auto Repair &lt;b&gt;"), "HTML is escaped");
  assert.ok(!rs.body.html.includes("<b>"), "no raw user HTML in email");
});

test("storage down (500), email OK -> 200 notified only", async () => {
  const f = mockFetch({ supabase: 500 });
  const { res, log } = await run(GOOD, ENV_BOTH, f);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json, { ok: true, stored: false, notified: true });
  assert.ok(log.lines.some((l) => l.includes("storage failed")));
});

test("storage NXDOMAIN-style network error, email OK -> 200", async () => {
  const f = mockFetch({ throwOn: "supabase" });
  const { res } = await run(GOOD, ENV_BOTH, f);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.stored, false);
  assert.equal(res.json.notified, true);
});

test("email down, storage OK -> 200 stored only", async () => {
  const f = mockFetch({ resend: 500 });
  const { res } = await run(GOOD, ENV_BOTH, f);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json, { ok: true, stored: true, notified: false });
});

test("only Supabase configured -> 200 stored", async () => {
  const f = mockFetch();
  const { res } = await run(GOOD, { SUPABASE_URL: ENV_BOTH.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: "k" }, f);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json, { ok: true, stored: true, notified: false });
});

test("only Resend configured -> 200 notified, LEAD_NOTIFY_TO respected", async () => {
  const f = mockFetch();
  const { res } = await run(GOOD, { RESEND_API_KEY: "re", LEAD_NOTIFY_TO: "a@x.com, b@x.com" }, f);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(f.calls[0].body.to, ["a@x.com", "b@x.com"]);
});

test("both fail -> 502", async () => {
  const f = mockFetch({ supabase: 500, resend: 401 });
  const { res } = await run(GOOD, ENV_BOTH, f);
  assert.equal(res.statusCode, 502);
});

test("duplicate submission (409) counts as stored", async () => {
  const f = mockFetch({ supabase: 409, resend: 500 });
  const { res } = await run(GOOD, ENV_BOTH, f);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.stored, true);
});

test("validation: missing name / contact / bad email / missing consent -> 422", async () => {
  const f = mockFetch();
  let r = await run({ ...GOOD, name: "   " }, ENV_BOTH, f);
  assert.equal(r.res.statusCode, 422); assert.ok(r.res.json.fields.name);
  r = await run({ ...GOOD, phone: "", email: "" }, ENV_BOTH, f);
  assert.equal(r.res.statusCode, 422); assert.ok(r.res.json.fields.contact);
  r = await run({ ...GOOD, email: "not-an-email" }, ENV_BOTH, f);
  assert.equal(r.res.statusCode, 422); assert.ok(r.res.json.fields.email);
  r = await run({ ...GOOD, consent_sms: false }, ENV_BOTH, f);
  assert.equal(r.res.statusCode, 422); assert.ok(r.res.json.fields.consent_sms);
  r = await run({ ...GOOD, phone: "12" }, ENV_BOTH, f);
  assert.equal(r.res.statusCode, 422); assert.ok(r.res.json.fields.phone);
  assert.equal(f.calls.length, 0, "nothing sent upstream for invalid leads");
});

test("sanitizing: control chars stripped, lengths capped, bad score/ids dropped", async () => {
  const f = mockFetch();
  await run({ ...GOOD, name: "Ja\u0000ne\u200B  " + "x".repeat(300), audit_score: 900, session_id: "<script>", landing_page: "javascript:alert(1)" }, ENV_BOTH, f);
  const b = f.calls.find((c) => c.url.includes("supabase")).body;
  assert.ok(!/[\u0000\u200B]/.test(b.name));
  assert.equal(b.name.length, 120);
  assert.equal(b.audit_score, null);
  assert.equal(b.session_id, null);
  assert.equal(b.landing_page, null);
});

test("honeypot filled -> fake 200, nothing stored or emailed", async () => {
  const f = mockFetch();
  const { res } = await run({ ...GOOD, website: "http://spam.example" }, ENV_BOTH, f);
  assert.equal(res.statusCode, 200);
  assert.equal(f.calls.length, 0);
});

test("rate limit: 6th request from same IP in 10 min -> 429", async () => {
  const f = mockFetch();
  const headers = { "x-forwarded-for": "203.0.113.9" };
  for (let i = 0; i < 5; i++) {
    const r = await run(GOOD, ENV_BOTH, f, { headers });
    assert.equal(r.res.statusCode, 200);
  }
  const r = await run(GOOD, ENV_BOTH, f, { headers });
  assert.equal(r.res.statusCode, 429);
  assert.equal(r.res.headers["retry-after"], "600");
});

test("method / content-type / JSON / origin guards", async () => {
  const f = mockFetch();
  assert.equal((await run(undefined, ENV_BOTH, f, { method: "GET" })).res.statusCode, 405);
  assert.equal((await run(GOOD, ENV_BOTH, f, { headers: { "content-type": "text/plain" } })).res.statusCode, 415);
  assert.equal((await run(undefined, ENV_BOTH, f, { raw: "{not json" })).res.statusCode, 400);
  assert.equal((await run(GOOD, ENV_BOTH, f, { headers: { origin: "https://evil.example" } })).res.statusCode, 403);
  assert.equal((await run(GOOD, ENV_BOTH, f, { headers: { origin: "https://repblaze.vercel.app" } })).res.statusCode, 200);
  assert.equal((await run(undefined, ENV_BOTH, f, { raw: "x".repeat(20000) })).res.statusCode, 413);
});

test("Vercel-style pre-parsed req.body works", async () => {
  const f = mockFetch();
  const req = makeReq(undefined);
  req.body = { ...GOOD };
  const res = makeRes();
  await handleLead(req, res, { env: ENV_BOTH, fetchImpl: f, log: quietLog() });
  assert.equal(res.statusCode, 200);
});

/* ---------- Google Sheets copy ---------- */
const ENV_SHEETS = { SUPABASE_URL: "https://mockproj.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/mock/exec", SHEETS_WEBHOOK_SECRET: "s3cret" };

test("sheets configured -> posts row after store with secret, still 200", async () => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (url.includes("script.google")) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    return new Response("", { status: 201 });
  };
  const { res } = await run(GOOD, ENV_SHEETS, f);
  assert.equal(res.statusCode, 200);
  const s = calls.find((c) => c.url.includes("script.google"));
  assert.ok(s);
  assert.equal(s.body.secret, "s3cret");
  assert.equal(s.body.lead.name, "Jane Smith");
  assert.match(s.body.lead.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test("sheets down/throwing -> lead still saved, 200", async () => {
  const f = async (url) => {
    if (url.includes("script.google")) throw new TypeError("boom");
    return new Response("", { status: 201 });
  };
  const { res, log } = await run(GOOD, ENV_SHEETS, f);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json.stored, true);
  assert.ok(log.lines.some((l) => l.includes("sheets copy failed")));
});

test("storage failed -> no sheets post", async () => {
  const urls = [];
  const f = async (url) => { urls.push(url); return new Response("x", { status: 500 }); };
  await run(GOOD, ENV_SHEETS, f);
  assert.ok(!urls.some((u) => u.includes("script.google")));
});
