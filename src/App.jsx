import { useState, useEffect, useRef, useCallback } from "react";
import "./audit-v2.css";
import { CONTACT } from "./contact.js";
import { BeforeAfterProfile, ReviewStarDemo } from "./Interactive.jsx";
import { useReveal } from "./useReveal.js";
import IntakeChat from "./IntakeChat.jsx";

/* Leads go to our own server route, which stores them (Supabase) AND emails Charlie. */
const LEAD_ENDPOINT = "/api/lead";
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
    items: ["Policy-safe review requests", "Approval-first response management", "Customer recovery workflow"],
    outcome: "BUILD TRUST",
  },
  {
    number: "03",
    title: "Local SEO & Conversion",
    copy: "We strengthen the path from local search to phone call with focused pages, clearer offers, and better local signals.",
    items: ["Local search optimization", "Conversion-focused landing pages", "Clear calls to action"],
    outcome: "WIN MORE CUSTOMERS",
  },
  {
    number: "04",
    title: "AI & Workflow Automation",
    copy: "We connect the repetitive steps behind your growth so leads, follow-up, intake, and reporting do not depend on memory.",
    items: ["Lead follow-up systems", "Custom intake and routing", "Simple owner dashboards"],
    outcome: "KEEP GROWING",
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

const MANAGED_DIFFERENCE = [
  ["Gives you another login", "Installs and runs the workflow"],
  ["Shows charts and leaves the work to you", "Prioritizes and completes the next action"],
  ["Auto-publishes generic replies", "Drafts in your voice and routes sensitive replies for approval"],
  ["Counts reviews", "Tracks your review pace against nearby competitors"],
  ["Stops after the review", "Opens a recovery task when a customer needs attention"],
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

class LeadError extends Error {
  constructor(code, fields) {
    super(code);
    this.code = code;
    this.fields = fields || null;
  }
}

function ContactFallback() {
  return (
    <div className="fallback" role="alert">
      <div className="fallback-title">We couldn’t send that just now.</div>
      <p>Your request did <b>not</b> go through and nothing was saved. Please reach us directly and we’ll take it from there:</p>
      <div className="fallback-actions">
        {CONTACT.tel && <a className="btn-primary" href={CONTACT.tel}>Call {CONTACT.phone}</a>}
        {CONTACT.sms && <a className="btn-ghost" href={CONTACT.sms}>Text us</a>}
        {CONTACT.email && (
          <a className="btn-ghost" href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("RepBlaze fix plan request")}`}>
            Email us
          </a>
        )}
      </div>
      {CONTACT.email && <div className="fallback-addr">{CONTACT.phone ? `${CONTACT.phone} · ` : ""}{CONTACT.email}</div>}
    </div>
  );
}

function LeadModal({ onClose, businessName, onSubmit }) {
  const [form, setForm] = useState({
    name: "", business: businessName || "", phone: "", email: "", notes: "",
    consentSms: false, consentEmail: false, website: "",
  });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [failed, setFailed] = useState(false);
  const submissionId = useRef(newSubmissionId());
  const firstField = useRef(null);
  const fallbackRef = useRef(null);

  useEffect(() => {
    if (failed) fallbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [failed]);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (sending) return;
    if (!form.name.trim()) { setErr("Enter your name so we know who to ask for."); return; }
    if (!form.phone.trim() && !form.email.trim()) { setErr("Add a phone or email so we can reach you."); return; }
    if (form.phone.trim() && !form.consentSms) { setErr("Please confirm we may contact you by text or remove the phone number."); return; }
    if (form.email.trim() && !form.consentEmail) { setErr("Please confirm we may contact you by email or remove the email address."); return; }
    setErr("");
    setFailed(false);
    setSending(true);
    try {
      await onSubmit({ ...form, submissionId: submissionId.current });
      setSent(true);
    } catch (e) {
      if (e?.code === "VALIDATION" && e.fields) {
        setErr(Object.values(e.fields)[0] || "Please check the form and try again.");
      } else if (e?.code === "RATE_LIMITED") {
        setErr("That’s a lot of tries in a short time. Please wait a few minutes, or reach us directly below.");
        setFailed(true);
      } else {
        setFailed(true);
      }
    } finally {
      setSending(false);
    }
  };

  const fields = [
    { k: "name", label: "Your name", ph: "Jane Smith", type: "text", ac: "name" },
    { k: "business", label: "Business", ph: "Business name", type: "text", ac: "organization" },
    { k: "phone", label: "Phone", ph: "(816) 000-0000", type: "tel", ac: "tel" },
    { k: "email", label: "Email", ph: "you@email.com", type: "email", ac: "email" },
    { k: "notes", label: "Notes (optional)", ph: "Anything we should know?", type: "text", ac: "off" },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="lead-title">
      <div onClick={(e) => e.stopPropagation()} className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        {!sent ? (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
            <div className="modal-flame" aria-hidden="true"><img src="/brand/flame-icon.png" alt="" /></div>
            <div id="lead-title" className="modal-title">Get your free fix plan</div>
            <div className="modal-sub">
              We’ll look over {form.business || "your business"}’s Google presence and walk you through what we’d fix first. No pressure.
            </div>
            {fields.map((f, i) => (
              <label key={f.k} className="field">
                <span>{f.label}</span>
                <input ref={i === 0 ? firstField : undefined} className="text-input" type={f.type} autoComplete={f.ac}
                  value={form[f.k]} placeholder={f.ph}
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
              </label>
            ))}
            {/* Honeypot: hidden from people, bots fill it in. */}
            <div className="hp" aria-hidden="true">
              <label>Website<input tabIndex={-1} autoComplete="off" value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
            </div>
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
            {err && <div className="form-error" role="alert">{err}</div>}
            {failed && <div ref={fallbackRef}><ContactFallback /></div>}
            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={sending}>
              {sending ? "Sending…" : failed ? "Try sending again" : "Send my fix-plan request"}
            </button>
          </form>
        ) : (
          <div className="modal-done">
            <div className="done-check" aria-hidden="true">✓</div>
            <div className="modal-title">Got it. Thank you!</div>
            <p>Your request came through. Charlie will follow up with you personally.</p>
            <button className="btn-ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE CONTENT
   ============================================================ */

const PILLARS = [
  { n: "01", title: "Get Found", copy: "A complete, accurate Google Business Profile so you show up when neighbors search for what you do.", icon: "pin" },
  { n: "02", title: "Build Trust", copy: "A simple, policy-safe way to ask every customer for an honest review, plus thoughtful replies.", icon: "star" },
  { n: "03", title: "Win More Customers", copy: "Clear photos, hours and calls-to-action, so the people comparing you can call, visit, or book in one tap.", icon: "phone" },
  { n: "04", title: "Keep Growing", copy: "Monthly check-ins on what changed, how you compare locally, and the next thing worth fixing.", icon: "trend" },
];

const EXAMPLES = [
  { img: "/photos/auto-repair-owner.jpg", name: "Main Street Auto Repair", line: "Gets the same-day brake job, not just the search impression." },
  { img: "/photos/barber-and-customer.jpg", name: "Corner Barber Co.", line: "Turns regulars’ good word into reviews new folks can actually see." },
  { img: "/photos/owners-on-shop-step.jpg", name: "Hometown Bakery & Café", line: "Keeps hours, photos and specials current, so nobody shows up to a locked door." },
];

const INCLUDED = [
  "Google Business Profile cleanup and monthly checks",
  "Text and email review-request workflow",
  "Review-reply drafts you approve before they post",
  "Low-rating alert with a follow-up task",
  "Local competitor and review-pace scorecard",
  "One completed visibility improvement every month",
  "A real person in St. Joseph you can call",
];

const ICON_PATHS = {
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  phone: "M6.6 3.5h2.8l1.4 3.9-1.9 1.3a11 11 0 0 0 6.4 6.4l1.3-1.9 3.9 1.4v2.8a1.6 1.6 0 0 1-1.7 1.6A16 16 0 0 1 5 5.2a1.6 1.6 0 0 1 1.6-1.7z",
  trend: "M4 17l5.5-5.5 3.5 3.5L20 8m0 0h-5m5 0v5",
};
function PillarIcon({ name }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
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
  const [navOpen, setNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const reportRef = useRef(null);
  const openModal = useCallback(() => { setNavOpen(false); setModalOpen(true); }, []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  useReveal([]);

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
    if (result) { const t = setTimeout(() => setChatOpen(true), 2500); return () => clearTimeout(t); }
  }, [result]);

  const handleLead = async (form) => {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      name: form.name,
      business: form.business,
      phone: form.phone,
      email: form.email,
      notes: form.notes,
      website: form.website, // honeypot
      source: form.source || params.get("utm_source") || (result ? "audit-tool" : "landing-page"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      content: params.get("utm_content"),
      term: params.get("utm_term"),
      landing_page: `${window.location.origin}${window.location.pathname}`,
      referrer: document.referrer || null,
      session_id: form.submissionId,
      audited_business: result?.name || null,
      audit_score: Number.isInteger(result?.score) ? result.score : null,
      consent_sms: Boolean(form.phone.trim() && form.consentSms),
      consent_email: Boolean(form.email.trim() && form.consentEmail),
    };

    let response;
    try {
      response = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new LeadError("NETWORK");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true) throw new LeadError(data.error || `HTTP_${response.status}`, data.fields);
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
        plan.push({ title: "Lift your star rating", impact: "HIGH", why: "A rating under 4.0 can turn customers away before they visit.", action: "Respond to every review and ask every customer for honest feedback." });
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
            <img src="/brand/flame-icon.png" alt="" width="44" height="44" />
            <span className="wordmark">Rep<span className="flame-text">Blaze</span></span>
          </a>
          <nav className={`desktop-nav ${navOpen ? "open" : ""}`} aria-label="Main navigation">
            <a href="#process" onClick={() => setNavOpen(false)}>How it works</a>
            <a href="#services" onClick={() => setNavOpen(false)}>What we do</a>
            <a href="#local" onClick={() => setNavOpen(false)}>Local</a>
            <a href="#audit" onClick={() => setNavOpen(false)}>Free audit</a>
          </nav>
          <div className="nav-right">
            <button className="nav-cta" onClick={openModal}>Get my fix plan</button>
            <button className="nav-toggle" aria-label="Menu" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section className="hero no-print">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-copy" data-reveal>
            <div className="eyebrow orange">Local reputation help · St. Joseph, Missouri</div>
            <h1>
              You’re good at what you do.{" "}
              <span className="flame-text">Let’s make sure your town knows&nbsp;it.</span>
            </h1>
            <p className="hero-lede">
              RepBlaze helps local shops, trades and restaurants get found on Google, earn genuine reviews, and look like the clear
              choice when neighbors compare their options. We do the work, and you stay in control of what gets posted.
            </p>
            <div className="hero-actions">
              <a className="btn-primary" href="#audit">Run my free audit</a>
              <a className="btn-ghost" href="#compare">See the difference</a>
            </div>
            <ul className="capability-line" aria-label="How we work">
              <li>Free audit, no signup</li>
              <li>Honest reviews only</li>
              <li>You approve replies</li>
              <li>Based in St. Joe</li>
            </ul>
          </div>

          <div className="hero-visual" data-reveal>
            <div className="hero-photo">
              <img src="/photos/cafe-owner-doorway.jpg" alt="Smiling café owner in an apron standing in her shop’s doorway" width="1400" height="934" fetchPriority="high" />
            </div>
            <div className="float-card float-review" aria-hidden="true">
              <div className="fc-stars">★★★★★</div>
              <div className="fc-line">Every happy customer is a review waiting to be asked for.</div>
            </div>
            <div className="float-card float-check" aria-hidden="true">
              <img src="/brand/flame-icon.png" alt="" />
              <div><b>Profile check</b><span>Hours · Photos · Replies</span></div>
            </div>
          </div>
        </section>

        {/* ---------- PILLARS ---------- */}
        <section className="pillars no-print" aria-label="What RepBlaze helps with">
          <div className="section-shell pillar-grid">
            {PILLARS.map((p, i) => (
              <article key={p.n} className="pillar" data-reveal style={{ "--d": `${i * 80}ms` }}>
                <div className="pillar-icon" aria-hidden="true"><PillarIcon name={p.icon} /></div>
                <span className="pillar-n">{p.n}</span>
                <h3>{p.title}</h3>
                <p>{p.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- AUDIT ---------- */}
        <section className="audit-section no-print" aria-labelledby="audit-title">
          <div className="section-shell audit-layout">
            <div className="audit-intro" data-reveal>
              <div className="eyebrow orange">Free visibility check</div>
              <h2>See what your customers see.</h2>
              <p>
                Type your business name and city. We pull your live Google profile, compare it with nearby businesses in your category,
                and show the gaps in plain English. It takes about a minute and there’s no signup.
              </p>
              <ul className="audit-points">
                <li><b>Profile grade</b> based on reviews, rating, photos, hours, phone and website</li>
                <li><b>Local standings</b> next to nearby businesses in the same category</li>
                <li><b>A short, prioritized fix list</b> you can print or save</li>
              </ul>
            </div>

            <section className="audit-panel" id="audit" data-reveal>
              <div className="panel-status">
                <span><i className={mapsReady ? "status-live" : "status-wait"} /> {mapsReady ? "Live Google data" : "Connecting to Google"}</span>
                <strong>FREE</strong>
              </div>
              <h3 id="audit-title">Audit my business</h3>
              <label className="audit-label" htmlFor="business-search">Business name + city / state</label>
              <input id="business-search" className="text-input audit-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
                placeholder="e.g. Main Street Auto Repair, St. Joseph MO" />
              <button className="btn-primary audit-button" onClick={runAudit} disabled={loading || !mapsReady}>
                {loading ? "Running inspection…" : "Run my free audit"}
              </button>
              {error && <div className="form-error" role="alert">{error}</div>}
              <div className="audit-note">Live profile data <b>·</b> Local competitor check <b>·</b> Clear next steps</div>
            </section>
          </div>
        </section>

        {loading && (
          <div className="report-shell">
            <div className="card loading-card">
              <span>Pulling live Google data and building your report…</span>
            </div>
          </div>
        )}

        {result && (
          <div ref={reportRef} className="report-shell audit-v2" style={{ scrollMarginTop: 92 }}>
            <div className="audit-brandbar"><img src="/brand/logo-side.webp" alt="RepBlaze" height="44" /><small>LOCAL VISIBILITY REPORT</small></div>
            <div className="audit-cover"><div className="audit-kicker">COMPLIMENTARY BUSINESS AUDIT · {new Date().toLocaleDateString()}</div><h2>{result.name}<span> / Visibility Report</span></h2><div className="audit-cover-meta"><span>BUSINESS <b>{result.name}</b></span><span>LOCATION <b>{result.address}</b></span><span>PREPARED BY <b>RepBlaze</b></span></div></div>
            <nav className="audit-toc no-print" aria-label="Audit report sections"><a href="#audit-snapshot"><em>00</em> Snapshot</a><a href="#audit-competition"><em>01</em> Competition</a><a href="#audit-evidence"><em>02</em> Evidence</a><a href="#audit-plan"><em>03</em> Action plan</a><a href="#audit-findings"><em>04</em> Findings</a></nav>
            <div className="print-only" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: "3px solid var(--red)" }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>REPBLAZE — PROFILE AUDIT REPORT</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 4 }}>{result.name} · {new Date().toLocaleDateString()}</div>
            </div>

            <div id="audit-snapshot" className="audit-section-head"><span>00</span><h3>Executive snapshot</h3></div>
            <section className="card rise audit-snapshot" style={{ marginBottom: 16, display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Audit result</div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>{result.name}</div>
                <div style={{ fontSize: 13, color: "var(--faint)", marginBottom: 12 }}>{result.address}</div>
                <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{gradeVerdict[result.grade]}</p>
              </div>
              <GradeStamp grade={result.grade} score={result.score} />
            </section>

            <div id="audit-competition" className="audit-section-head"><span>01</span><h3>Local competitor landscape</h3></div>
            <RankLadder rivals={result.rivals} youName={result.name} />
            {!result.rivals && <p className="audit-empty">Comparable local competitor data was not available for this search. No ranking was inferred.</p>}

            <div id="audit-evidence" className="audit-section-head"><span>02</span><h3>Evidence and profile health</h3></div>
            <div className="audit-visual-strip"><div><strong>{result.reviewCount.toLocaleString()}</strong><span>Google reviews</span></div><div><strong>{result.reviewCount ? result.rating.toFixed(1) : "—"}</strong><span>Star rating / 5</span></div><div><strong>{result.photoCapped ? "10+" : result.photoCount}</strong><span>Photos returned by API*</span></div><div><strong>{completeness}/5</strong><span>Key profile fields</span></div></div>
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

            <div id="audit-plan" className="audit-section-head"><span>03</span><h3>Prioritized improvement plan</h3></div>
            <ActionPlan plan={result.plan} />

            <div id="audit-findings" className="audit-section-head"><span>04</span><h3>Diagnostic findings</h3></div>
            <section className="card rise" style={{ marginBottom: 16, animationDelay: "0.25s" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Findings — tap to expand</div>
              {result.issues.map((i, idx) => <Finding key={idx} text={i.text} level={i.level} />)}
            </section>

            <p className="audit-method">Source: Google Places API and optional website scan. Photo totals are limited to images returned by the API, not the full gallery. Report score reflects profile checks only; not a verified estimate of sales, traffic, or search ranking.</p>
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

        {/* ---------- BEFORE / AFTER ---------- */}
        <section className="compare-section no-print" id="compare" aria-labelledby="compare-title">
          <div className="section-shell compare-layout">
            <div className="section-heading" data-reveal>
              <div className="eyebrow orange">Same business, better first impression</div>
              <h2 id="compare-title">Your Google profile is your new front window.</h2>
              <p>
                Most people meet a local business on Google before they ever walk in. A profile with no photos, missing hours and
                unanswered reviews looks closed, even when you’re busy. Drag the slider to see the difference a complete profile makes.
              </p>
              <a className="text-link" href="#audit">Check my profile <span>→</span></a>
            </div>
            <div data-reveal><BeforeAfterProfile /></div>
          </div>
        </section>

        {/* ---------- REVIEW DEMO ---------- */}
        <section className="reviews-section no-print" aria-labelledby="reviews-title">
          <div className="section-shell">
            <div className="section-heading center" data-reveal>
              <div className="eyebrow orange">Genuine reviews, made easy</div>
              <h2 id="reviews-title">Ask every customer. Hear every customer.</h2>
              <p>After a job or visit, your customer gets a friendly text or email asking how it went. Try it yourself:</p>
            </div>
            <div data-reveal><ReviewStarDemo /></div>
          </div>
        </section>

        {/* ---------- EXAMPLES ---------- */}
        <section className="examples-section no-print" aria-labelledby="examples-title">
          <div className="section-shell">
            <div className="section-heading" data-reveal>
              <div className="eyebrow orange">Built for the shops on your street</div>
              <h2 id="examples-title">If customers find you on Google, we can help.</h2>
              <p>Auto shops, barbers, bakeries, contractors, salons, restaurants: the businesses that keep a town running.</p>
            </div>
            <div className="example-grid">
              {EXAMPLES.map((ex, i) => (
                <article key={ex.name} className="example-card" data-reveal style={{ "--d": `${i * 90}ms` }}>
                  <div className="example-img"><img src={ex.img} alt="" loading="lazy" /></div>
                  <div className="example-body">
                    <span className="example-tag">Example</span>
                    <h3>{ex.name}</h3>
                    <p>{ex.line}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="fine-print">Example business names are made up for illustration. Photos are licensed stock images, not RepBlaze clients.</p>
          </div>
        </section>

        {/* ---------- SERVICES ---------- */}
        <section className="content-section no-print" id="services">
          <div className="section-shell">
            <div className="section-heading" data-reveal>
              <div className="eyebrow orange">What we do</div>
              <h2>One local growth system. Four jobs handled.</h2>
              <p>Most local businesses don’t only have a visibility problem or only a follow-up problem. They have both. RepBlaze connects the whole path from search to sale.</p>
            </div>
            <div className="offer-grid">
              {OFFERS.map((offer, i) => (
                <article className="offer-card" key={offer.number} data-reveal style={{ "--d": `${(i % 2) * 90}ms` }}>
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

        {/* ---------- LOOP ---------- */}
        <section className="loop-section no-print">
          <div className="section-shell">
            <div className="section-heading" data-reveal>
              <div className="eyebrow orange">The reputation loop</div>
              <h2>A review isn’t the finish line. It’s the next step.</h2>
              <p>RepBlaze turns customer feedback into a simple routine, and you stay in control of anything that gets published.</p>
            </div>
            <div className="loop-grid">
              {REPUTATION_LOOP.map((step, i) => (
                <article key={step.number} data-reveal style={{ "--d": `${i * 80}ms` }}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
            <div className="approval-strip" data-reveal>
              <div><span>Default mode</span><strong>Draft → You approve → We post</strong></div>
              <p>Replies and sensitive profile changes wait for your OK until you tell us otherwise.</p>
            </div>
          </div>
        </section>

        {/* ---------- DIFFERENCE ---------- */}
        <section className="difference-section no-print" aria-labelledby="difference-title">
          <div className="section-shell difference-layout">
            <div className="section-heading difference-heading" data-reveal>
              <div className="eyebrow orange">Why RepBlaze instead of another app</div>
              <h2 id="difference-title">Apps show you the work. We get it done.</h2>
              <p>Software can generate drafts and dashboards. Someone still has to check the data, protect your name, finish the task and show what changed. That’s us.</p>
            </div>
            <div className="difference-table" role="table" aria-label="Typical software compared with RepBlaze" data-reveal>
              <div className="difference-head" role="row">
                <span role="columnheader">Typical software</span>
                <span role="columnheader">RepBlaze</span>
              </div>
              {MANAGED_DIFFERENCE.map(([software, repblaze]) => (
                <div className="difference-row" role="row" key={software}>
                  <span role="cell">{software}</span>
                  <strong role="cell">{repblaze}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- PROCESS ---------- */}
        <section className="process-section no-print" id="process">
          <div className="section-shell process-layout">
            <div className="section-heading process-heading" data-reveal>
              <div className="eyebrow orange">How it works</div>
              <h2>Check. Fix. Keep it going.</h2>
              <p>No mystery marketing. We find the gaps, fix the foundation, and keep things moving every month.</p>
              <a className="text-link" href="#audit">Start with the free audit <span>→</span></a>
            </div>
            <div className="process-list">
              {PROCESS.map((step, i) => (
                <article key={step.number} data-reveal style={{ "--d": `${i * 90}ms` }}>
                  <span>{step.number}</span>
                  <div><h3>{step.title}</h3><p>{step.copy}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- LOCAL ---------- */}
        <section className="local-section no-print" id="local" aria-labelledby="local-title">
          <div className="local-photo" role="img" aria-label="Historic brick buildings on a downtown street in St. Joseph, Missouri" />
          <div className="section-shell local-inner">
            <div className="local-card" data-reveal>
              <div className="eyebrow orange">Right here in St. Joe</div>
              <h2 id="local-title">A local business helping local businesses.</h2>
              <p>
                RepBlaze is based in St. Joseph, Missouri, part of Dream Chasers Unlimited LLC. You won’t get a call center. You’ll
                get someone who knows the town, can meet in person, and picks up the phone.
              </p>
              <div className="button-row">
                <button className="btn-primary" onClick={openModal}>Talk to us about your business</button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- WHAT'S INCLUDED (no published price) ---------- */}
        <section className="pricing-section no-print" id="pricing">
          <div className="section-shell pricing-shell">
            <div className="pricing-copy" data-reveal>
              <div className="eyebrow orange">What’s included</div>
              <h2>Managed for you. Not another login.</h2>
              <p>
                We handle the work local owners don’t have time to set up, watch, and improve. After your free audit we’ll walk you
                through what we’d fix first and what it costs, in plain numbers, with no pressure.
              </p>
            </div>
            <div className="pricing-card" data-reveal>
              <div className="eyebrow">RepBlaze managed reputation system</div>
              <ul>
                {INCLUDED.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <button className="btn-primary" onClick={openModal}>Get my free fix plan</button>
              <p className="price-note">Honest feedback only. No review gating, no quotas, no asking for five-star language. We never promise rankings or sales; we make sure you’re putting your best foot forward.</p>
            </div>
          </div>
        </section>

        {/* ---------- FINAL CTA ---------- */}
        <section className="final-cta no-print">
          <div className="section-shell final-cta-inner" data-reveal>
            <img className="final-flame" src="/brand/flame-icon.png" alt="" aria-hidden="true" />
            <div>
              <h2>You’re good at what you do.<br /><span className="flame-text">Let’s make sure your town knows it.</span></h2>
              <p>Start with a free audit. See the gaps. Decide from there.</p>
            </div>
            <div className="button-row cta-buttons">
              <a className="btn-primary" href="#audit">Run my free audit</a>
              <button className="btn-ghost" onClick={openModal}>Get my fix plan</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer no-print">
        <div className="section-shell footer-grid">
          <div className="footer-brand">
            <img src="/brand/flame-icon.png" alt="" width="96" height="96" loading="lazy" />
          </div>
          <div className="footer-col">
            <div className="footer-script">Rep<span className="flame-text">Blaze</span></div>
            <p>Get Found · Build Trust · Win More Customers · Keep Growing</p>
            <p>St. Joseph, Missouri · A Dream Chasers Unlimited LLC brand</p>
          </div>
          <nav className="footer-col footer-links" aria-label="Footer">
            <a href="#audit">Free audit</a>
            <a href="#process">How it works</a>
            <a href="#services">What we do</a>
            <button onClick={openModal}>Get my fix plan</button>
          </nav>
        </div>
        <div className="section-shell credits">
          Photos: Ketut Subiyanto, Gustavo Fring, RDNE Stock project, Kampus Production (Pexels License). Downtown St. Joseph photo by{" "}
          <a href="https://commons.wikimedia.org/w/index.php?curid=1255985" rel="noopener noreferrer" target="_blank">Tim Kiser</a>,{" "}
          <a href="https://creativecommons.org/licenses/by-sa/2.5/" rel="noopener noreferrer" target="_blank">CC BY-SA 2.5</a>.
          People and businesses pictured are not RepBlaze clients.
        </div>
      </footer>

      <IntakeChat key={result?.name || "none"} open={chatOpen} setOpen={setChatOpen} audit={result} onSubmit={handleLead} />

      {modalOpen && (
        <LeadModal onClose={closeModal} businessName={result?.name} onSubmit={handleLead} />
      )}
    </div>
  );
}
