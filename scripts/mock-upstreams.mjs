// Tiny local stand-in for Supabase REST + Resend, for end-to-end testing of /api/lead.
// Usage: node scripts/mock-upstreams.mjs [port]   (MOCK_FAIL=supabase|resend|both to force errors)
import http from "node:http";
const port = Number(process.argv[2] || 8787);
const fail = process.env.MOCK_FAIL || "";
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const kind = req.url.startsWith("/rest/v1/") ? "supabase" : req.url.startsWith("/emails") ? "resend" : "other";
    const shouldFail = fail === "both" || fail === kind;
    console.log(`[mock ${kind}] ${req.method} ${req.url} auth=${(req.headers.authorization || "").slice(0, 14)}… -> ${shouldFail ? 500 : "ok"} body=${body.slice(0, 160)}`);
    if (shouldFail) { res.writeHead(500); return res.end('{"message":"mock failure"}'); }
    if (kind === "supabase") { res.writeHead(201); return res.end(); }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"id":"mock-email-id"}');
  });
}).listen(port, "127.0.0.1", () => console.log(`mock upstreams on :${port}`));
