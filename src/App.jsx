import { useState, useEffect, useRef } from "react";

/* ============================================================
   CONFIG
   ------------------------------------------------------------
   LEAD_ENDPOINT: your RepBlaze Apps Script web-app /exec URL.
   Leads POST here AND back up to localStorage — never lost.
   ============================================================ */
const LEAD_ENDPOINT = ""; // ← paste Apps Script /exec URL here

/* ---------- helpers ---------- */

const daysAgo = (d) => Math.floor((Date.now() - d.getTime()) / 86400000);

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
};

const FINDING_OK = {
  "Strong rating": "Your rating is excellent. The job is protecting and growing it.",
  "Healthy review volume": "Strong review count. Consistency keeps the momentum.",
  "Website linked": "Your website is connected — good.",
  "Photo gallery active": "Solid photo presence. Fresh uploads keep it working.",
  "Ahead of nearby competitors": "You're outperforming nearby businesses in your category. Worth defending.",
};

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
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 70px", gap: 14, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
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
          <div key={i} style={{
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

function LeadModal({ open, onClose, businessName, onSubmit }) {
  const [form, setForm] = useState({ name: "", business: "", phone: "", email: "", notes: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { setForm((f) => ({ ...f, business: businessName || f.business })); }, [businessName]);
  useEffect(() => { if (open) { setSent(false); setErr(""); } }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!form.name.trim()) { setErr("Enter your name so we know who to ask for."); return; }
    if (!form.phone.trim() && !form.email.trim()) { setErr("Add a phone or email so we can reach you."); return; }
    onSubmit(form);
    setSent(true);
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
              Leave your info and we'll reach out with a plan and pricing for {form.business || "your business"}.
            </div>
            {fields.map((f) => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <div className="eyebrow" style={{ fontSize: 10, marginBottom: 5 }}>{f.label}</div>
                <input className="text-input" value={form[f.k]} placeholder={f.ph}
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
            ))}
            {err && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button className="btn-primary" style={{ width: "100%", marginTop: 4 }} onClick={submit}>Send it</button>
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

  const handleLead = (form) => {
    const lead = { ...form, source: "audit-tool", auditedBusiness: result?.name || "", score: result?.score ?? "", ts: new Date().toISOString() };
    // Backup first — a lead is never lost even if the endpoint is down.
    try {
      const stash = JSON.parse(localStorage.getItem("repblaze_leads") || "[]");
      stash.push(lead);
      localStorage.setItem("repblaze_leads", JSON.stringify(stash));
    } catch { /* storage full/blocked — endpoint POST below still fires */ }
    if (LEAD_ENDPOINT) {
      fetch(LEAD_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(lead) }).catch(() => {});
    }
  };

  const runAudit = async () => {
    if (!query.trim() || !mapsReady || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

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
        hasHours, hasWebsite, hasPhone, lastReviewDays,
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
    <div style={{ minHeight: "100vh" }}>
      {/* header */}
      <header className="no-print" style={{ borderBottom: "2px solid var(--ink)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 20px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--sans)", fontWeight: 900, fontSize: 20, letterSpacing: "-0.01em" }}>
            REP<span style={{ color: "var(--red)" }}>BLAZE</span>
          </div>
          <div className="eyebrow" style={{ fontSize: 10 }}>
            {mapsReady ? "Profile audit" : <span style={{ animation: "blink 1.2s infinite" }}>Loading…</span>}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* hero */}
        <section className="no-print" style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
            Your Google profile,<br />graded like an <span style={{ color: "var(--red)" }}>inspection.</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted)", margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
            Free instant audit of any local business — real data from Google, ranked against the competitors near you. No signup.
          </p>
        </section>

        {/* search */}
        <section className="card no-print" style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Business name + city / state</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input className="text-input" style={{ flex: 1, minWidth: 200 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
              placeholder="e.g. Dream of Sneakerz, St. Joseph MO"
              aria-label="Business name and city" />
            <button className="btn-primary" onClick={runAudit} disabled={loading || !mapsReady}>
              {loading ? "Auditing…" : "Run audit"}
            </button>
          </div>
          {error && <div style={{ marginTop: 10, color: "var(--red)", fontSize: 14 }}>{error}</div>}
        </section>

        {loading && (
          <div className="card" style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)" }}>
            <span style={{ animation: "blink 1s infinite" }}>Pulling live Google data…</span>
          </div>
        )}

        {/* ============ REPORT ============ */}
        {result && (
          <div ref={reportRef} style={{ scrollMarginTop: 20 }}>
            {/* print header */}
            <div className="print-only" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: "3px solid var(--red)" }}>
              <div style={{ fontWeight: 900, fontSize: 20 }}>REPBLAZE — PROFILE AUDIT REPORT</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 4 }}>{result.name} · {new Date().toLocaleDateString()}</div>
            </div>

            {/* grade card */}
            <section className="card rise" style={{ marginBottom: 16, display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Audit result</div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>{result.name}</div>
                <div style={{ fontSize: 13, color: "var(--faint)", marginBottom: 12 }}>{result.address}</div>
                <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{gradeVerdict[result.grade]}</p>
              </div>
              <GradeStamp grade={result.grade} score={result.score} />
            </section>

            {/* rank ladder — the "see it" moment */}
            <RankLadder rivals={result.rivals} youName={result.name} />

            {/* metrics */}
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

            <ActionPlan plan={result.plan} />

            {/* findings */}
            <section className="card rise" style={{ marginBottom: 16, animationDelay: "0.25s" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Findings — tap to expand</div>
              {result.issues.map((i, idx) => <Finding key={idx} text={i.text} level={i.level} />)}
            </section>

            {/* CTA */}
            <section className="card rise no-print" style={{ animationDelay: "0.3s", borderTop: "3px solid var(--red)" }}>
              <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Want this handled for you?</div>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 18px" }}>
                RepBlaze manages your Google profile, automates review collection, responds to every review, and tracks the competitors above — so you can run your business.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>Get my fix plan</button>
                <button className="btn-ghost" onClick={() => window.print()}>Print / save report</button>
              </div>
            </section>
          </div>
        )}

        {!loading && !result && !error && (
          <p className="no-print" style={{ textAlign: "center", color: "var(--faint)", fontSize: 14 }}>
            Enter a business above to run a free audit.
          </p>
        )}
      </main>

      <footer className="no-print" style={{ borderTop: "1px solid var(--line)", padding: "20px", textAlign: "center" }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>RepBlaze · Local reputation, managed · St. Joseph, MO</span>
      </footer>

      <LeadModal open={modalOpen} onClose={() => setModalOpen(false)} businessName={result?.name} onSubmit={handleLead} />
    </div>
  );
}
