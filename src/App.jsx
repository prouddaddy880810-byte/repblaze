import { useState, useEffect, useRef } from "react";

/* Public project URL + publishable key. RLS limits anonymous traffic to validated inserts. */
const SUPABASE_URL = "https://ixqzawhedscwggbhgwtz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Z5l9fxifrirlyCU5wHgJfA_fKkZjc4e";
const LEAD_ENDPOINT = `${SUPABASE_URL}/rest/v1/leads`;
const daysAgo = (d) => Math.floor((Date.now() - d.getTime()) / 86400000);

const newSubmissionId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const gradeOf = (score) => {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
};

const gradeColor = (g) =>
  g === "A" || g === "B" ? "var(--green)" : g === "C" ? "var(--amber)" : "var(--red)";

const gradeVerdict = {
  A: "Strong profile. The job now is defending the lead.",
  B: "Solid foundation with clear room to grow.",
  C: "Meaningful gaps. Customers comparing options may pass you over.",
  D: "Serious gaps that can push customers to competitors.",
  F: "Critical gaps across the profile. This is likely costing you customers.",
};

/* ---------- finding copy (why it matters / how RepBlaze fixes it) ---------- */

const FINDING_DETAIL = {
  "Low star rating": {
    why: "A rating below 4.0 can turn customers away before they ever visit, and weakens the trust signals that help you stand out locally.",
    fix: "RepBlaze responds to every review and runs a consistent review-request system designed to lift your average over time.",
  },
  "No reviews yet": {
    why: "With zero reviews, customers comparing local options have no proof anyone chose you. Most will pick the business with visible feedback.",
    fix: "RepBlaze sets up an automated review-request flow so every customer becomes a chance at a review.",
  },
  "Thin review count": {
    why: "Profiles with more recent reviews tend to look more trusted to new customers. A thin count limits how often people choose you.",
    fix: "RepBlaze automates review requests by text after every customer interaction.",
  },
  "Reviews going stale": {
    why: "When the newest reviews visible on your profile are months old, the business can look inactive — even if it's busy.",
    fix: "RepBlaze keeps fresh reviews flowing so your profile always looks alive.",
  },
  "No photos": {
    why: "Listings with photos tend to get more engagement than those without. An empty gallery can look inactive or incomplete.",
    fix: "RepBlaze sets up and manages a photo strategy to keep your profile active and engaging.",
  },
  "Hours not listed": {
    why: "Missing hours can send a ready-to-buy customer to a competitor who shows theirs.",
    fix: "RepBlaze completes and maintains your full profile so nothing is missing.",
  },
  "No website linked": {
    why: "No website link can signal lower credibility to customers comparing their options.",
    fix: "RepBlaze links and optimizes your web presence across your Google profile.",
  },
  "No phone number": {
    why: "Missing contact info means customers can't reach you quickly, and an incomplete profile looks less trustworthy.",
    fix: "RepBlaze audits and completes your full profile for stronger trust signals.",
  },
  "Behind nearby competitors": {
    why: "Nearby businesses in your category show stronger review numbers, which pulls customers toward them when they compare options side by side.",
    fix: "RepBlaze tracks competitor activity and runs consistent review collection to close the gap.",
  },
  "Site not using HTTPS": {
    why: "Browsers mark sites without HTTPS as not secure, and that warning can stop a ready customer before the page even loads.",
    fix: "RepBlaze gets a valid certificate installed and every page pointed at the secure version.",
  },
  "No structured business data on site": {
    why: "Without business data marked up on the site, search engines have to guess at your name, address, and hours instead of reading them directly.",
    fix: "RepBlaze adds structured business data so your site reinforces the profile customers find.",
  },
  "Thin website content": {
    why: "A page with very little content gives search engines almost nothing to work with, so competitors with fuller pages tend to surface first.",
    fix: "RepBlaze builds out the service and location content that gives your site something to rank on.",
  },
  "Missing page heading (H1)": {
    why: "With no main heading, the page never states plainly what the business does, which weakens both search relevance and first impressions.",
    fix: "RepBlaze sets a clear, specific heading on every page so the offer lands immediately.",
  },
  "Missing meta description": {
    why: "When the description is missing, search engines write your search snippet for you, and the result rarely sells the business well.",
    fix: "RepBlaze writes descriptions that turn search impressions into actual visits.",
  },
};

const FINDING_OK = {
  "Strong rating": "Your rating is excellent. The job is protecting and growing it.",
  "Healthy review volume": "Strong review count. Consistency keeps the momentum.",
  "Website linked": "Your website is connected — good.",
  "Photo gallery active": "Solid photo presence. Fresh uploads keep it working.",
  "Ahead of nearby competitors": "You're outperforming nearby businesses in your category. Worth defending.",
  "HTTPS enabled": "Your site loads securely. Worth keeping the certificate current.",
  "Structured data present": "Structured business data is on the site — good. Keep it matched to your profile.",
  "Solid page content": "There's real content on the page for search engines to work with.",
  "Page heading in place": "The page states what the business does. Keep it aligned to what customers search.",
  "Meta description set": "Your search snippet is under your control rather than auto-generated.",
};

/* Maps a /api/scan result onto the same finding shape the audit uses. */
const siteHost = (url) => {
  try { return new URL(url).hostname.replace(/^www[.]/, ""); } catch { return url; }
};

const siteFindings = (scan) => {
  if (!scan || scan.ok !== true) return [];
  const out = [];

  if (scan.isHttps === false) out.push({ text: "Site not using HTTPS", level: "critical" });
  else if (scan.isHttps === true) out.push({ text: "HTTPS enabled", level: "ok" });

  if (scan.hasLocalBusinessSchema === false) out.push({ text: "No structured business data on site", level: "warning" });
  else if (scan.hasLocalBusinessSchema === true) out.push({ text: "Structured data present", level: "ok" });

  if (scan.isThin === true) out.push({ text: "Thin website content", level: "warning" });
  else if (scan.isThin === false) out.push({ text: "Solid page content", level: "ok" });

  if (scan.h1Count === 0) out.push({ text: "Missing page heading (H1)", level: "warning" });
  else if (scan.h1Count > 0) out.push({ text: "Page heading in place", level: "ok" });

  if ("description" in scan) {
    if (!scan.description) out.push({ text: "Missing meta description", level: "warning" });
    else out.push({ text: "Meta description set", level: "ok" });
  }

  return out;
};

const OFFERS = [
  {
    number: "01",
    title: "Google Business Profile",
    copy: "We clean up, optimize, and actively manage the profile customers use to decide whether to call you or a competitor.",
    items: ["Profile optimization", "Photos, posts, and updates", "Competitor gap tracking"],
    outcome: "GET FOUND",
  },
  {
    number: "02",
    title: "Reviews & Reputation",
    copy: "We build a steady review engine, respond professionally, and make sure your reputation keeps working after the job is done.",
    items: ["Automated review requests", "Review response management", "Private feedback recovery"],
    outcome: "GET CHOSEN",
  },
  {
    number: "03",
    title: "Local SEO & Conversion",
    copy: "We strengthen the path from local search to phone call with focused pages, clearer offers, and better local signals.",
    items: ["Local search optimization", "Conversion-focused landing pages", "Clear calls to action"],
    outcome: "WIN THE CLICK",
  },
  {
    number: "04",
    title: "AI & Workflow Automation",
    copy: "We connect the repetitive steps behind your growth so leads, follow-up, intake, and reporting do not depend on memory.",
    items: ["Lead follow-up systems", "Custom intake and routing", "Simple owner dashboards"],
    outcome: "RUN SMARTER",
  },
];

const PROCESS = [
  { number: "1", title: "Expose the gaps", copy: "Run the free audit. We compare your live profile data with nearby competitors and show where attention is leaking." },
  { number: "2", title: "Install the system", copy: "We fix the foundation and connect review requests, response drafts, owner approvals, and recovery alerts." },
  { number: "3", title: "Manage the momentum", copy: "RepBlaze monitors the work, reports the numbers, and adjusts the next move every month." },
];

const REPUTATION_LOOP = [
  { number: "01", title: "Request", copy: "Every completed job becomes a consistent, policy-safe request for honest feedback." },
  { number: "02", title: "Respond", copy: "New reviews receive an on-brand response draft instead of sitting unanswered." },
  { number: "03", title: "Recover", copy: "Negative feedback creates an owner alert and a clear follow-up task." },
  { number: "04", title: "Improve", copy: "A monthly scorecard shows review growth, response speed, and the next visibility gap." },
];

/* ---------- small components ---------- */

function GradeStamp({ grade, score }) {
  const color = gradeColor(grade);
  return (
    <div
      aria-label={"Grade " + grade + ", score " + score + " out of 100"}
      style={{
        width: 130, height: 130, border: "5px solid " + color, borderRadius: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", color, flexShrink: 0,
        transform: "rotate(-8deg)", animation: "stampIn 0.55s cubic-bezier(0.2,0.8,0.2,1) both",
        animationDelay: "0.35s", fontFamily: "var(--mono)",
        boxShadow: "inset 0 0 0 2px " + color,
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{grade}</div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em" }}>{score} / 100</div>
    </div>
  );
}

function MetricRow({ label, value, display, max, ok }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPct(Math.min((value / max) * 100, 100)), 150);
    return () => clearTimeout(t);
  }, [value, max]);
  const color = ok ? "var(--green)" : "var(--red)";
  return (
    <div className="metric-row" style={{ display: "grid", gridTemplateColumns: "150px 1fr 70px", gap: 14, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="eyebrow" style={{ color: "var(--muted)" }}>{label}</span>
      <div style={{ background: "var(--paper)", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 99, transition: "width 1s cubic-bezier(0.2,0.8,0.2,1)" }} />
      </div>
      <span style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 14, textAlign: "right", color: "var(--ink)" }}>{display}</span>
    </div>
  );
}

/* Signature element: named competitors, ranked, with YOU slotted in */
function RankLadder({ rivals, youName }) {
  if (!rivals || rivals.length < 2) return null;
  const youIdx = rivals.findIndex((r) => r.you);
  return (
    <section className="card rise" style={{ marginBottom: 16, animationDelay: "0.1s" }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Local standings — same category, near you</div>
      <div style={{ fontSize: 15, marginBottom: 18, color: "var(--muted)" }}>
        Ranked by review count. You're <strong style={{ color: youIdx === 0 ? "var(--green)" : "var(--red)" }}>#{youIdx + 1} of {rivals.length}</strong>.
      </div>
      <div role="table" aria-label="Local competitor standings">
        {rivals.map((r, i) => (
          <div className="rank-row" key={i} style={{
            display: "grid", gridTemplateColumns: "34px 1fr 64px 78px", gap: 10, alignItems: "center",
            padding: "10px 12px", borderRadius: 6, marginBottom: 4,
            background: r.you ? "rgba(217,43,33,0.06)" : "transparent",
            borderLeft: r.you ? "3px solid var(--red)" : "3px solid transparent",
          }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: r.you ? "var(--red)" : "var(--faint)" }}>#{i + 1}</span>
            <span style={{ fontSize: 14, fontWeight: r.you ? 700 : 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.you ? youName + "  ← you" : r.name}
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, textAlign: "right", color: "var(--muted)" }}>{r.rating ? r.rating.toFixed(1) + "★" : "—"}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, textAlign: "right", color: r.you ? "var(--red)" : "var(--ink)" }}>{r.reviews} rev</span>
          </div>
        ))}
      </div>
      {youIdx > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
          The #1 business here has <strong style={{ color: "var(--ink)" }}>{rivals[0].reviews - rivals[youIdx].reviews} more reviews</strong> than you.
          Closing that gap is the most direct lever RepBlaze pulls.
        </div>
      )}
    </section>
  );
}

function Finding({ text, level }) {
  const [open, setOpen] = useState(false);
  const cfg = {
    critical: { color: "var(--red)", tag: "FAIL" },
    warning: { color: "var(--amber)", tag: "FLAG" },
    ok: { color: "var(--green)", tag: "PASS" },
  }[level];
  const detail = FINDING_DETAIL[text];
  const okDetail = FINDING_OK[text];
  const expandable = !!(detail || okDetail);
  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button
        onClick={() => expandable && setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "13px 4px", background: "none", border: "none",
          cursor: expandable ? "pointer" : "default", textAlign: "left",
        }}
      >
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          color: cfg.color, border: "1.5px solid " + cfg.color, borderRadius: 4,
          padding: "2px 7px", flexShrink: 0,
        }}>{cfg.tag}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{text}</span>
        {expandable && <span style={{ color: "var(--faint)", fontSize: 12 }}>{open ? "−" : "+"}</span>}
      </button>
      {open && detail && (
        <div style={{ padding: "0 4px 16px 52px", fontSize: 14, lineHeight: 1.65, color: "var(--muted)" }}>
          <p style={{ margin: "0 0 8px" }}><strong style={{ color: "var(--red)" }}>Why it costs you: </strong>{detail.why}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "var(--green)" }}>How we fix it: </strong>{detail.fix}</p>
        </div>
      )}
      {open && okDetail && (
        <div style={{ padding: "0 4px 16px 52px", fontSize: 14, lineHeight: 1.65, color: "var(--muted)" }}>{okDetail}</div>
      )}
    </div>
  );
}

function ActionPlan({ plan }) {
  const [openIdx, setOpenIdx] = useState(0);
  if (!plan || plan.length === 0) return null;
  const impactColor = { HIGH: "var(--red)", MEDIUM: "var(--amber)", LOW: "var(--blue)" };
  return (
    <section className="card rise" style={{ marginBottom: 16, animationDelay: "0.2s" }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>RepBlaze action plan</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 14 }}>Ranked by estimated impact. Tap any step.</div>
      {plan.map((p, i) => {
        const open = openIdx === i;
        return (
          <div key={i} style={{ borderBottom: i < plan.length - 1 ? "1px solid var(--line)" : "none" }}>
            <button onClick={() => setOpenIdx(open ? -1 : i)} aria-expanded={open}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 4px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14, color: "var(--faint)", width: 22, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{p.title}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: impactColor[p.impact], flexShrink: 0 }}>{p.impact}</span>
            </button>
            {open && (
              <div style={{ padding: "0 4px 16px 38px", fontSize: 14, lineHeight: 1.65, color: "var(--muted)" }}>
                <p style={{ margin: "0 0 6px" }}>{p.why}</p>
                <p style={{ margin: 0, color: "var(--green)", fontWeight: 500 }}>→ {p.action}</p>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function LeadModal({ onClose, businessName, onSubmit }) {
  const [form, setForm] = useState({
    name: "", business: businessName || "", phone: "", email: "", notes: "",
    consentSms: false, consentEmail: false,
  });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const submissionId = useRef(newSubmissionId());

  const submit = async () => {
    if (sending) return;
    if (!form.name.trim()) { setErr("Enter your name so we know who to ask for."); return; }
    if (!form.phone.trim() && !form.email.trim()) { setErr("Add a phone or email so we can reach you."); return; }
    if (form.phone.trim() && !form.consentSms) { setErr("Please confirm we may contact you by text or remove the phone number."); return; }
    if (form.email.trim() && !form.consentEmail) { setErr("Please confirm we may contact you by email or remove the email address."); return; }
    setErr("");
    setSending(true);
    try {
      await onSubmit({ ...form, submissionId: submissionId.current });
      setSent(true);
    } catch {
      setErr("We couldn't send your request. Please try again — your information was not stored in this browser.");
    } finally {
      setSending(false);
    }
  };

  const fields = [
    { k: "name", label: "Your name", ph: "Jane Smith" },
    { k: "business", label: "Business", ph: "Business name" },
    { k: "phone", label: "Phone", ph: "(816) 000-0000" },
    { k: "email", label: "Email", ph: "you@email.com" },
    { k: "notes", label: "Notes (optional)", ph: "Anything we should know?" },
  ];

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(23,19,14,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        {!sent ? (
          <>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>Get your fix plan</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18, lineHeight: 1.55 }}>
              We’ll review the gaps and show you what the $99/month managed system should handle for {form.business || "your business"}.
            </div>
            {fields.map((f) => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <div className="eyebrow" style={{ fontSize: 10, marginBottom: 5 }}>{f.label}</div>
                <input className="text-input" value={form[f.k]} placeholder={f.ph}
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
            ))}
            {form.phone.trim() && (
              <label className="consent-row">
                <input type="checkbox" checked={form.consentSms}
                  onChange={(e) => setForm({ ...form, consentSms: e.target.checked })} />
                <span>RepBlaze may text me about this request. Message and data rates may apply. Reply STOP to opt out.</span>
              </label>
            )}
            {form.email.trim() && (
              <label className="consent-row">
                <input type="checkbox" checked={form.consentEmail}
                  onChange={(e) => setForm({ ...form, consentEmail: e.target.checked })} />
                <span>RepBlaze may email me about this request. I can unsubscribe at any time.</span>
              </label>
            )}
            {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button className="btn-primary" style={{ width: "100%", marginTop: 4 }} onClick={submit} disabled={sending}>
              {sending ? "Sending…" : "Send my fix-plan request"}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontFamily: "var(--mono)", color: "var(--green)", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>✓ Sent</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>We've got your info. Expect to hear from RepBlaze fast.</div>
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [siteScan, setSiteScan] = useState(null);
  const [siteScanLoading, setSiteScanLoading] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    const check = setInterval(() => {
      if (window.__mapsReady && window.google?.maps?.places?.Place) {
        setMapsReady(true);
        clearInterval(check);
      }
    }, 200);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (result && reportRef.current) reportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const handleLead = async (form) => {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      name: form.name.trim().slice(0, 120),
      business_name: form.business.trim().slice(0, 160) || null,
      phone: form.phone.trim().slice(0, 40) || null,
      email: form.email.trim().toLowerCase().slice(0, 254) || null,
      notes: form.notes.trim().slice(0, 2000) || null,
      source: params.get("utm_source")?.slice(0, 120) || (result ? "audit-tool" : "landing-page"),
      medium: params.get("utm_medium")?.slice(0, 120) || null,
      campaign: params.get("utm_campaign")?.slice(0, 160) || null,
      content: params.get("utm_content")?.slice(0, 160) || null,
      landing_page: `${window.location.origin}${window.location.pathname}`.slice(0, 500),
      referrer: document.referrer.slice(0, 500) || null,
      session_id: form.submissionId,
      first_touch_source: params.get("utm_source")?.slice(0, 120) || "direct",
      last_touch_source: params.get("utm_source")?.slice(0, 120) || "direct",
      audited_business: result?.name?.slice(0, 160) || null,
      audit_score: Number.isInteger(result?.score) ? result.score : null,
      consent_sms: Boolean(form.phone.trim() && form.consentSms),
      consent_email: Boolean(form.email.trim() && form.consentEmail),
      raw_payload: { client_version: "landing-v2", has_audit: Boolean(result) },
    };

    const response = await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    // A retry with the same submission ID means the original request already landed.
    if (!response.ok && response.status !== 409) {
      throw new Error(`Lead submission failed: ${response.status}`);
    }
  };

  const runAudit = async () => {
    if (!query.trim() || !mapsReady || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSiteScan(null);
    setSiteScanLoading(false);

    try {
      const { places } = await window.google.maps.places.Place.searchByText({
        textQuery: query,
        fields: ["id", "displayName", "formattedAddress", "rating", "userRatingCount",
          "regularOpeningHours", "photos", "websiteURI", "nationalPhoneNumber",
          "location", "primaryType", "primaryTypeDisplayName", "types", "reviews", "businessStatus"],
      });

      if (!places || places.length === 0) {
        setError("No business found. Try adding the city and state.");
        setLoading(false);
        return;
      }

      const place = places[0];
      const rating = place.rating || 0;
      const reviewCount = place.userRatingCount || 0;
      const photoCount = place.photos ? place.photos.length : 0;
      const photoCapped = photoCount >= 10; // Places API returns at most 10
      const hasHours = !!place.regularOpeningHours;
      const hasWebsite = !!place.websiteURI;
      const hasPhone = !!place.nationalPhoneNumber;

      // ---- Website scan: fired, never awaited — must not delay the profile report ----
      if (hasWebsite) {
        try {
          setSiteScanLoading(true);
          fetch("/api/scan?url=" + encodeURIComponent(place.websiteURI))
            .then((r) => r.json())
            .then((data) => setSiteScan(data))
            .catch(() => setSiteScan({ ok: false }))
            .finally(() => setSiteScanLoading(false));
        } catch {
          // site scan is optional — never blocks the audit
          setSiteScan({ ok: false });
          setSiteScanLoading(false);
        }
      }

      // Newest review visible among the profile's top reviews (API returns up to 5).
      let lastReviewDays = null;
      if (place.reviews && place.reviews.length) {
        const times = place.reviews
          .map((r) => (r.publishTime ? new Date(r.publishTime) : null))
          .filter((d) => d && !isNaN(d));
        if (times.length) lastReviewDays = daysAgo(new Date(Math.max(...times.map((d) => d.getTime()))));
      }

      // ---- Named competitors: same category, nearby ----
      let rivals = null;
      try {
        const typeKeyword = place.primaryTypeDisplayName || (place.primaryType || "").replace(/_/g, " ");
        if (typeKeyword && place.formattedAddress) {
          const { places: nearby } = await window.google.maps.places.Place.searchByText({
            textQuery: typeKeyword + " near " + place.formattedAddress,
            fields: ["id", "displayName", "rating", "userRatingCount"],
            maxResultCount: 8,
          });
          const others = (nearby || [])
            .filter((p) => p.id !== place.id && (p.userRatingCount || 0) > 0)
            .slice(0, 5)
            .map((p) => ({ name: p.displayName, rating: p.rating || 0, reviews: p.userRatingCount || 0, you: false }));
          if (others.length) {
            rivals = [...others, { name: place.displayName, rating, reviews: reviewCount, you: true }]
              .sort((a, b) => b.reviews - a.reviews);
          }
        }
      } catch { /* competitor pull is optional — never blocks the audit */ }

      // ---- Score (hard data only, totals 100) ----
      let score = 0;
      const issues = [];

      if (reviewCount === 0) {
        issues.push({ text: "No reviews yet", level: "critical" });
      } else if (rating >= 4.5) score += 30;
      else if (rating >= 4.0) score += 22;
      else if (rating >= 3.5) score += 14;
      else { score += 5; issues.push({ text: "Low star rating", level: "critical" }); }

      if (reviewCount >= 100) score += 25;
      else if (reviewCount >= 50) score += 18;
      else if (reviewCount >= 20) score += 12;
      else if (reviewCount >= 5) score += 6;
      else if (reviewCount > 0) issues.push({ text: "Thin review count", level: "critical" });

      if (photoCount >= 10) score += 15;
      else if (photoCount >= 5) score += 10;
      else if (photoCount >= 1) score += 5;
      else issues.push({ text: "No photos", level: "critical" });

      if (hasHours) score += 10; else issues.push({ text: "Hours not listed", level: "warning" });
      if (hasWebsite) score += 10; else issues.push({ text: "No website linked", level: "warning" });
      if (hasPhone) score += 10; else issues.push({ text: "No phone number", level: "warning" });

      if (lastReviewDays !== null && lastReviewDays > 180) {
        issues.push({ text: "Reviews going stale", level: "warning" });
      }

      const youIdx = rivals ? rivals.findIndex((r) => r.you) : -1;
      if (rivals) {
        if (youIdx === 0) issues.push({ text: "Ahead of nearby competitors", level: "ok" });
        else issues.push({ text: "Behind nearby competitors", level: youIdx >= Math.ceil(rivals.length / 2) ? "critical" : "warning" });
      }

      if (reviewCount > 0 && rating >= 4.5) issues.push({ text: "Strong rating", level: "ok" });
      if (reviewCount >= 50) issues.push({ text: "Healthy review volume", level: "ok" });
      if (hasWebsite) issues.push({ text: "Website linked", level: "ok" });
      if (photoCount >= 10) issues.push({ text: "Photo gallery active", level: "ok" });

      // ---- Action plan from real gaps ----
      const plan = [];
      if (rivals && youIdx > 0) {
        const gap = rivals[0].reviews - reviewCount;
        plan.push({ title: "Close the review gap", impact: "HIGH", why: "The top business near you has " + gap + " more reviews. Review count is the number customers compare first.", action: "Automated review requests by text after every completed sale or job." });
      } else if (reviewCount < 20) {
        plan.push({ title: "Build your review base", impact: "HIGH", why: "A thin review count limits how trusted your profile looks to new customers.", action: "Start a consistent review-request flow to steadily grow the count." });
      }
      if (reviewCount > 0 && rating < 4.0) {
        plan.push({ title: "Lift your star rating", impact: "HIGH", why: "A rating under 4.0 can turn customers away before they visit.", action: "Respond to every review and route happy customers to leave feedback." });
      }
      if (lastReviewDays !== null && lastReviewDays > 180) {
        plan.push({ title: "Get fresh reviews flowing", impact: "HIGH", why: "The newest review visible on your profile is about " + Math.round(lastReviewDays / 30) + " months old. A quiet profile reads as a quiet business.", action: "Restart review collection immediately — recency matters as much as volume." });
      }
      if (photoCount < 5) plan.push({ title: "Add profile photos", impact: "MEDIUM", why: "Listings with more photos tend to get more clicks and direction requests.", action: "Upload fresh photos of your work, team, and location monthly." });
      if (!hasHours) plan.push({ title: "Complete your hours", impact: "MEDIUM", why: "Missing hours can send customers to a competitor.", action: "Add full business hours, including holiday hours." });
      if (!hasWebsite) plan.push({ title: "Link your website", impact: "MEDIUM", why: "No website link can lower perceived credibility.", action: "Add your website or a simple landing page to your profile." });
      if (!hasPhone) plan.push({ title: "Add a phone number", impact: "MEDIUM", why: "Customers need a fast way to reach you.", action: "Add a primary phone number to your profile." });
      if (plan.length === 0) plan.push({ title: "Defend your lead", impact: "LOW", why: "Your profile is strong. Consistency keeps you ahead.", action: "Keep collecting reviews and posting updates to protect your position." });
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      plan.sort((a, b) => order[a.impact] - order[b.impact]);

      const s = Math.min(score, 100);
      setResult({
        name: place.displayName, address: place.formattedAddress,
        status: place.businessStatus || "OPERATIONAL",
        rating, reviewCount, photoCount, photoCapped,
        hasHours, hasWebsite, hasPhone, lastReviewDays, website: place.websiteURI,
        score: s, grade: gradeOf(s), issues, plan: plan.slice(0, 5), rivals,
      });
    } catch (e) {
      setError("Something went wrong running the audit: " + e.message);
    }
    setLoading(false);
  };

  const completeness = result
    ? [result.reviewCount > 0, result.photoCount > 0, result.hasHours, result.hasWebsite, result.hasPhone].filter(Boolean).length
    : 0;

  return (
    <div className="site-shell" id="top">
      <header className="site-header no-print">
        <div className="nav-shell">
          <a className="brand" href="#top" aria-label="RepBlaze home">
            REP<span>BLAZE</span><i aria-hidden="true" />
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#system">The system</a>
            <a href="#pricing">Pricing</a>
            <a href="#audit">Free audit</a>
          </nav>
          <button className="nav-cta" onClick={() => setModalOpen(true)}>Get a fix plan</button>
        </div>
      </header>

      <main>
        <section className="hero no-print">
          <div className="hero-copy">
            <div className="eyebrow orange">Done-for-you reputation system for local businesses</div>
            <h1>Win the search.<br />Earn the <span>trust.</span><br />Keep the customer.</h1>
            <p className="hero-lede">
              RepBlaze installs and manages the workflow behind your Google profile: review requests, response drafts, issue recovery, and monthly visibility tracking — starting at $99/month.
            </p>
            <div className="hero-actions">
              <a className="btn-primary" href="#audit">Show me my reputation gaps</a>
              <a className="btn-ghost" href="#pricing">See the $99 system</a>
            </div>
            <div className="capability-line" aria-label="RepBlaze capabilities">
              <span>Month-to-month</span>
              <span>Human-approved responses</span>
              <span>Owner-operated businesses</span>
            </div>
          </div>

          <section className="audit-panel metal-panel" id="audit" aria-labelledby="audit-title">
            <div className="panel-status">
              <span><i className={mapsReady ? "status-live" : "status-wait"} /> {mapsReady ? "Live Google data" : "Connecting to Google"}</span>
              <strong>FREE</strong>
            </div>
            <div className="eyebrow">RepBlaze visibility check</div>
            <h2 id="audit-title">See what customers see.</h2>
            <p>Find your business, get a profile grade, and see how you stack up against nearby competitors. No signup.</p>
            <label className="eyebrow audit-label" htmlFor="business-search">Business name + city / state</label>
            <input id="business-search" className="text-input audit-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
              placeholder="e.g. Dream of Sneakerz, St. Joseph MO"
              aria-label="Business name and city" />
            <button className="btn-primary audit-button" onClick={runAudit} disabled={loading || !mapsReady}>
              {loading ? "Running inspection…" : "Audit my business"}
            </button>
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="audit-note">Live profile data <b>·</b> Local competitor check <b>·</b> Clear next steps</div>
          </section>
        </section>

        {loading && (
          <div className="report-shell">
            <div className="card loading-card">
              <span>Pulling live Google data and building your report…</span>
            </div>
          </div>
        )}

        {result && (
          <div ref={reportRef} className="report-shell" style={{ scrollMarginTop: 92 }}>
            <div className="print-only" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: "3px solid var(--red)" }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>REPBLAZE — PROFILE AUDIT REPORT</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 4 }}>{result.name} · {new Date().toLocaleDateString()}</div>
            </div>

            <section className="card rise" style={{ marginBottom: 16, display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Audit result</div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>{result.name}</div>
                <div style={{ fontSize: 13, color: "var(--faint)", marginBottom: 12 }}>{result.address}</div>
                <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{gradeVerdict[result.grade]}</p>
              </div>
              <GradeStamp grade={result.grade} score={result.score} />
            </section>

            <RankLadder rivals={result.rivals} youName={result.name} />

            <section className="card rise" style={{ marginBottom: 16, animationDelay: "0.15s" }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Profile readings — live Google data</div>
              <MetricRow label="Star rating" value={result.rating} max={5}
                display={result.reviewCount ? result.rating.toFixed(1) + " ★" : "—"} ok={result.rating >= 4} />
              <MetricRow label="Reviews" value={result.reviewCount} max={150}
                display={String(result.reviewCount)} ok={result.reviewCount >= 50} />
              <MetricRow label="Photos" value={result.photoCount} max={10}
                display={result.photoCapped ? "10+" : String(result.photoCount)} ok={result.photoCount >= 5} />
              <MetricRow label="Profile complete" value={completeness} max={5}
                display={completeness + "/5"} ok={completeness === 5} />
              {result.lastReviewDays !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 2px" }}>
                  <span className="eyebrow">Newest visible review</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 14, color: result.lastReviewDays > 180 ? "var(--red)" : "var(--green)" }}>
                    {result.lastReviewDays === 0 ? "today" : result.lastReviewDays + " days ago"}
                  </span>
                </div>
              )}
            </section>

            {result.hasWebsite && (
              <section className="card rise" style={{ marginBottom: 16, animationDelay: "0.18s" }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  Website scan — {siteHost(result.website)}
                </div>
                {siteScanLoading ? (
                  <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 2px" }}>Scanning your website…</p>
                ) : siteFindings(siteScan).length ? (
                  siteFindings(siteScan).map((f, idx) => <Finding key={idx} text={f.text} level={f.level} />)
                ) : (
                  <p style={{ fontSize: 14, color: "var(--faint)", margin: "6px 0 2px" }}>
                    Couldn't fully scan this site — may need manual review
                  </p>
                )}
              </section>
            )}

            <ActionPlan plan={result.plan} />

            <section className="card rise" style={{ marginBottom: 16, animationDelay: "0.25s" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Findings — tap to expand</div>
              {result.issues.map((i, idx) => <Finding key={idx} text={i.text} level={i.level} />)}
            </section>

            <section className="card rise no-print result-cta" style={{ animationDelay: "0.3s" }}>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Want RepBlaze to close these gaps?</div>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 18px" }}>
                We manage the profile, review flow, responses, and local visibility system behind this report — then track what improves.
              </p>
              <div className="button-row">
                <button className="btn-primary" onClick={() => setModalOpen(true)}>Build my fix plan</button>
                <button className="btn-ghost" onClick={() => window.print()}>Print / save report</button>
              </div>
            </section>
          </div>
        )}

        <section className="system-band no-print" id="system" aria-label="RepBlaze outcomes">
          <div className="section-shell band-grid">
            <div>
              <div className="eyebrow orange">The RepBlaze system</div>
              <h2>Google creates the moment.<br />We help you win it.</h2>
            </div>
            <div className="outcome-grid">
              <div><strong>01</strong><span>Be visible when they search</span></div>
              <div><strong>02</strong><span>Look like the clear choice</span></div>
              <div><strong>03</strong><span>Make the next step easy</span></div>
              <div><strong>04</strong><span>Follow up without chasing</span></div>
            </div>
          </div>
        </section>

        <section className="loop-section no-print">
          <div className="section-shell">
            <div className="section-heading loop-heading">
              <div className="eyebrow orange">The managed reputation loop</div>
              <h2>A review is not the finish line.<br />It is the next trigger.</h2>
              <p>Most tools hand you another inbox. RepBlaze turns customer feedback into a repeatable operating workflow, with you in control of what gets published.</p>
            </div>
            <div className="loop-grid">
              {REPUTATION_LOOP.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
            <div className="approval-strip">
              <div><span>DEFAULT MODE</span><strong>Draft → Approve → Act</strong></div>
              <p>Automation earns trust. Responses and sensitive profile changes stay approval-first until the workflow proves dependable.</p>
            </div>
          </div>
        </section>

        <section className="content-section no-print" id="services">
          <div className="section-shell">
            <div className="section-heading">
              <div className="eyebrow orange">What we do</div>
              <h2>One growth system.<br />Four jobs handled.</h2>
              <p>Most local businesses do not have a visibility problem or a follow-up problem. They have both. RepBlaze connects the full path from search to sale.</p>
            </div>
            <div className="offer-grid">
              {OFFERS.map((offer) => (
                <article className="offer-card metal-panel" key={offer.number}>
                  <div className="offer-top"><span>{offer.number}</span><strong>{offer.outcome}</strong></div>
                  <h3>{offer.title}</h3>
                  <p>{offer.copy}</p>
                  <ul>
                    {offer.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="process-section no-print" id="process">
          <div className="section-shell process-layout">
            <div className="section-heading process-heading">
              <div className="eyebrow orange">How it works</div>
              <h2>Diagnose.<br />Build.<br />Manage.</h2>
              <p>No mystery marketing. We identify the leaks, install the right system, and keep the machine moving.</p>
              <a className="text-link" href="#audit">Start with the free audit <span>→</span></a>
            </div>
            <div className="process-list">
              {PROCESS.map((step) => (
                <article key={step.number}>
                  <span>{step.number}</span>
                  <div><h3>{step.title}</h3><p>{step.copy}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-section no-print" id="pricing">
          <div className="section-shell pricing-shell">
            <div className="pricing-copy">
              <div className="eyebrow orange">Simple launch offer</div>
              <h2>Managed outcomes.<br />Not another login.</h2>
              <p>Software-only review tools are cheap. RepBlaze is priced for the work local owners do not have time to install, monitor, and improve.</p>
              <div className="price-line"><strong>$99</strong><span>/ month</span></div>
              <div className="setup-line">$349 one-time setup · Month-to-month</div>
            </div>
            <div className="pricing-card metal-panel">
              <div className="eyebrow">RepBlaze managed reputation system</div>
              <ul>
                <li>Google Business Profile baseline and monthly checks</li>
                <li>SMS and email review-request workflow</li>
                <li>Review-response drafts with owner approval</li>
                <li>Negative-feedback alert and recovery task</li>
                <li>Monthly visibility and reputation scorecard</li>
                <li>Direct owner support</li>
              </ul>
              <button className="btn-primary" onClick={() => setModalOpen(true)}>Get my fix plan</button>
              <p className="price-note">Messaging usage and custom integrations are quoted separately. Honest feedback only—no review gating.</p>
            </div>
          </div>
        </section>

        <section className="final-cta no-print">
          <div className="section-shell final-cta-inner metal-panel">
            <div>
              <div className="eyebrow orange">Built for local businesses</div>
              <h2>Your next customer is already comparing you.</h2>
              <p>See the gap. Get the fix plan. Let RepBlaze run the system.</p>
            </div>
            <div className="button-row cta-buttons">
              <a className="btn-primary" href="#audit">Audit my business</a>
              <button className="btn-ghost" onClick={() => setModalOpen(true)}>Get my $99 plan</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer no-print">
        <div className="section-shell footer-grid">
          <div className="brand footer-brand">REP<span>BLAZE</span><i aria-hidden="true" /></div>
          <div>Local visibility, reputation, and automation systems.</div>
          <div>St. Joseph, Missouri · A Dream Chasers Unlimited brand</div>
        </div>
      </footer>

      {modalOpen && (
        <LeadModal onClose={() => setModalOpen(false)} businessName={result?.name} onSubmit={handleLead} />
      )}
    </div>
  );
}
