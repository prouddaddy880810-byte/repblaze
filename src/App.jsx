import { useState, useEffect, useRef } from "react";

const FONT = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";

// Animated number counter — ticks from 0 to target on mount
function useCountUp(target, duration = 1200, decimals = 0) {
  const [val, setVal] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return decimals ? val.toFixed(decimals) : Math.round(val);
}

function Counter({ to, decimals = 0, suffix = "" }) {
  const v = useCountUp(to, 1200, decimals);
  return <span>{v}{suffix}</span>;
}

const scoreColor = (score) => {
  if (score >= 80) return "#00ff88";
  if (score >= 50) return "#ffd700";
  return "#ff4444";
};

const scoreLabel = (score) => {
  if (score >= 80) return "HEALTHY";
  if (score >= 50) return "NEEDS WORK";
  return "CRITICAL";
};

const issueDetails = {
  "LOW RATING": {
    why: "A rating below 4.0 stars can turn customers away before they visit, and may weaken the trust signals that help you stand out locally.",
    fix: "RepBlaze responds to every review and runs a consistent review request system to lift your average over time."
  },
  "FEW REVIEWS": {
    why: "Profiles with more recent reviews tend to look more trusted to new customers. A thin review count can limit how often people choose you.",
    fix: "RepBlaze automates review requests by text after every customer interaction."
  },
  "NO PHOTOS": {
    why: "Listings with photos tend to get more engagement than those without. An empty profile can look inactive or incomplete.",
    fix: "RepBlaze sets up and manages a photo strategy to keep your profile active and engaging."
  },
  "NO HOURS LISTED": {
    why: "Missing hours can cause customers to choose a competitor, and may signal an incomplete profile.",
    fix: "RepBlaze completes and maintains your full profile so nothing is missing."
  },
  "NO WEBSITE LINKED": {
    why: "No website link can signal lower credibility to potential customers comparing their options.",
    fix: "RepBlaze links and optimizes your web presence across your Google profile."
  },
  "NO PHONE NUMBER": {
    why: "Missing contact info means customers can't reach you quickly, and an incomplete profile can look less trustworthy.",
    fix: "RepBlaze audits and completes your full profile for stronger trust signals."
  },
  "BEHIND COMPETITORS": {
    why: "Nearby competitors have stronger review counts or ratings, which can pull customers toward them when they compare local options.",
    fix: "RepBlaze tracks competitor activity and helps you close the gap with consistent review collection."
  }
};

const okDetails = {
  "STRONG RATING": "Your rating is excellent. We help you protect and grow it.",
  "GOOD REVIEW VOLUME": "Strong review count. We help maintain momentum.",
  "WEBSITE LINKED": "Good — your website is connected.",
  "PHOTOS STRONG": "Great photo presence. We help keep it fresh.",
  "AHEAD OF COMPETITORS": "You're outperforming nearby competitors. We help you defend that lead."
};

function ScoreRing({ score }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const animScore = useCountUp(score, 1400);
  const dash = (animScore / 100) * circ;
  const color = scoreColor(score);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
        animation: "pulse 2s ease-in-out infinite"
      }} />
      <svg width="160" height="160" viewBox="0 0 140 140">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#ffffff08" strokeWidth="12" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 70 70)" filter="url(#glow)" />
        <text x="70" y="62" textAnchor="middle" fill={color} fontSize="32"
          fontFamily={MONO} fontWeight="bold" filter="url(#glow)">{animScore}</text>
        <text x="70" y="80" textAnchor="middle" fill="#ffffff66" fontSize="9"
          fontFamily={MONO} letterSpacing="3">OUT OF 100</text>
        <text x="70" y="96" textAnchor="middle" fill={color} fontSize="9"
          fontFamily={MONO} letterSpacing="2" filter="url(#glow)">{scoreLabel(score)}</text>
      </svg>
    </div>
  );
}

function StatBar({ label, value, max, color = "#ffd700", display, decimals = 0 }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPct(Math.min((value / max) * 100, 100)), 100);
    return () => clearTimeout(t);
  }, [value, max]);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#ffffff66", fontSize: 11, letterSpacing: 1.5, fontFamily: MONO }}>{label}</span>
        <span style={{ color, fontSize: 13, fontFamily: MONO, fontWeight: "bold" }}>{display ?? <Counter to={value} decimals={decimals} />}</span>
      </div>
      <div style={{ background: "#ffffff0a", borderRadius: 99, height: 6, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 10px ${color}66`,
          transition: "width 1.3s cubic-bezier(0.16,1,0.3,1)"
        }} />
      </div>
    </div>
  );
}

function IssueCard({ text, level }) {
  const [open, setOpen] = useState(false);
  const configs = {
    critical: { color: "#ff4444", bg: "#ff444410", border: "#ff444440", icon: "⚠" },
    warning: { color: "#ffd700", bg: "#ffd70010", border: "#ffd70040", icon: "◆" },
    ok: { color: "#00ff88", bg: "#00ff8810", border: "#00ff8840", icon: "✓" }
  };
  const c = configs[level];
  const detail = issueDetails[text];
  const okDetail = okDetails[text];

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, marginBottom: 10, overflow: "hidden",
      transition: "all 0.3s"
    }}>
      <div
        onClick={() => (detail || okDetail) && setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", cursor: detail || okDetail ? "pointer" : "default"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: c.color, fontSize: 14 }}>{c.icon}</span>
          <span style={{ color: c.color, fontSize: 11, fontFamily: MONO, letterSpacing: 1.5, fontWeight: "bold" }}>{text}</span>
        </div>
        {(detail || okDetail) && (
          <span style={{ color: c.color, fontSize: 12, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
        )}
      </div>
      {open && detail && (
        <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${c.border}` }}>
          <div style={{ paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: "#ffffff88", lineHeight: 1.7, marginBottom: 10 }}>
              <span style={{ color: "#ff4444", fontWeight: "bold" }}>WHY IT HURTS: </span>
              {detail.why}
            </div>
            <div style={{ fontSize: 12, color: "#ffffff88", lineHeight: 1.7 }}>
              <span style={{ color: "#00ff88", fontWeight: "bold" }}>HOW WE FIX IT: </span>
              {detail.fix}
            </div>
          </div>
        </div>
      )}
      {open && okDetail && (
        <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${c.border}` }}>
          <div style={{ paddingTop: 14, fontSize: 12, color: "#ffffff88", lineHeight: 1.7 }}>{okDetail}</div>
        </div>
      )}
    </div>
  );
}

function GlassCard({ children, style = {}, glow = false, className = "", onClick }) {
  return (
    <div className={className} onClick={onClick} style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, backdropFilter: "blur(20px)", padding: 28,
      boxShadow: glow
        ? "0 0 40px rgba(255,215,0,0.08), 0 20px 60px rgba(0,0,0,0.4)"
        : "0 20px 60px rgba(0,0,0,0.3)",
      ...style
    }}>
      {children}
    </div>
  );
}

// REAL competitor comparison — built from actual nearby Places data
function CompetitorBox({ comp }) {
  const [open, setOpen] = useState(false);
  if (!comp || comp.count === 0) return null;
  const { avgRating, avgReviews, count, yourRating, yourReviews, pressure } = comp;
  const pressureColor = pressure === "HIGH" ? "#ff4444" : pressure === "MODERATE" ? "#ffd700" : "#00ff88";
  const reviewGap = avgReviews - yourReviews;
  const ratingAhead = Math.round(yourRating * 10) >= Math.round(avgRating * 10);
  return (
    <GlassCard className="reveal hover-lift" style={{ marginBottom: 20, border: "1px solid rgba(0,170,255,0.2)", cursor: "pointer", animationDelay: "0.1s" }} onClick={() => setOpen(!open)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#00aaff", fontFamily: MONO }}>COMPETITOR PRESSURE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: "bold", color: pressureColor, letterSpacing: 2, padding: "4px 12px", borderRadius: 99, background: `${pressureColor}15`, border: `1px solid ${pressureColor}40`, fontFamily: MONO }}>{pressure}</div>
          <span style={{ color: "#00aaff", fontSize: 12, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#ffffff44", marginBottom: 16, letterSpacing: 0.5 }}>
        Compared against {count} nearby business{count > 1 ? "es" : ""} in the same category
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 9, color: "#ffffff44", letterSpacing: 1, marginBottom: 8, fontFamily: MONO }}>AVG RATING</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: "bold", fontFamily: MONO, color: ratingAhead ? "#00ff88" : "#ff4444" }}><Counter to={yourRating} decimals={1} /></span>
            <span style={{ fontSize: 11, color: "#ffffff44" }}>you</span>
            <span style={{ fontSize: 15, color: "#ffffff66", marginLeft: "auto", fontFamily: MONO }}>{avgRating.toFixed(1)}</span>
            <span style={{ fontSize: 11, color: "#ffffff44" }}>them</span>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 9, color: "#ffffff44", letterSpacing: 1, marginBottom: 8, fontFamily: MONO }}>AVG REVIEWS</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: "bold", fontFamily: MONO, color: yourReviews >= avgReviews ? "#00ff88" : "#ff4444" }}><Counter to={yourReviews} /></span>
            <span style={{ fontSize: 11, color: "#ffffff44" }}>you</span>
            <span style={{ fontSize: 15, color: "#ffffff66", marginLeft: "auto", fontFamily: MONO }}>{avgReviews}</span>
            <span style={{ fontSize: 11, color: "#ffffff44" }}>them</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "#ffffff88", lineHeight: 1.7 }}>
          {reviewGap > 0
            ? `You're behind by about ${reviewGap} reviews on average. Closing that gap is the fastest lever to look more trusted in local search — RepBlaze automates review collection to get you there.`
            : `You're matching or beating nearby competitors on reviews. RepBlaze helps you defend that lead with consistent collection and fast responses.`}
        </div>
      )}
    </GlassCard>
  );
}

// Action Plan — ranked, generated from REAL gaps found, items expandable
function ActionPlan({ plan }) {
  const [openIdx, setOpenIdx] = useState(0);
  if (!plan || plan.length === 0) return null;
  const impactColor = { HIGH: "#ff4444", MEDIUM: "#ffd700", LOW: "#00aaff" };
  return (
    <GlassCard className="reveal" style={{ marginBottom: 20, animationDelay: "0.2s" }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: "#ffd700", marginBottom: 6, fontFamily: MONO }}>REPBLAZE ACTION PLAN</div>
      <div style={{ fontSize: 11, color: "#ffffff44", marginBottom: 20, letterSpacing: 0.5 }}>Ranked by estimated impact · tap to expand</div>
      {plan.map((p, i) => {
        const open = openIdx === i;
        return (
          <div key={i} onClick={() => setOpenIdx(open ? -1 : i)}
            style={{ display: "flex", gap: 14, marginBottom: 12, paddingBottom: 12, borderBottom: i < plan.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer", borderRadius: 10, padding: 10, background: open ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.25s" }}>
            <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 13, fontFamily: MONO }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: open ? 8 : 0, flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{p.title}</span>
                <span style={{ fontSize: 9, fontWeight: "bold", letterSpacing: 1.5, color: impactColor[p.impact], padding: "3px 10px", borderRadius: 99, background: `${impactColor[p.impact]}15`, border: `1px solid ${impactColor[p.impact]}40`, fontFamily: MONO }}>{p.impact} IMPACT</span>
              </div>
              {open && (
                <div style={{ animation: "reveal 0.3s ease both" }}>
                  <div style={{ fontSize: 12, color: "#ffffff77", lineHeight: 1.6, marginBottom: 6 }}>{p.why}</div>
                  <div style={{ fontSize: 12, color: "#00ff88cc", lineHeight: 1.6 }}><span style={{ fontWeight: "bold" }}>→ </span>{p.action}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </GlassCard>
  );
}

// Lead capture modal — stores locally, ready to wire to backend
function LeadModal({ open, onClose, businessName, onSubmit }) {
  const [form, setForm] = useState({ name: "", business: businessName || "", phone: "", email: "", notes: "" });
  const [sent, setSent] = useState(false);

  useEffect(() => { setForm(f => ({ ...f, business: businessName || "" })); }, [businessName]);

  if (!open) return null;

  const submit = () => {
    if (!form.name || (!form.phone && !form.email)) return;
    onSubmit(form);
    setSent(true);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440 }}>
        <GlassCard glow style={{ border: "1px solid rgba(255,215,0,0.25)" }}>
          {!sent ? (
            <>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 6 }}>Activate RepBlaze</div>
              <div style={{ fontSize: 12, color: "#ffffff66", marginBottom: 22, lineHeight: 1.6 }}>Drop your info and we'll reach out with your full plan and pricing.</div>
              {[
                { k: "name", label: "YOUR NAME", ph: "Jane Smith" },
                { k: "business", label: "BUSINESS", ph: "Business name" },
                { k: "phone", label: "PHONE", ph: "(816) 000-0000" },
                { k: "email", label: "EMAIL", ph: "you@email.com" },
                { k: "notes", label: "NOTES (OPTIONAL)", ph: "Anything we should know?" }
              ].map(f => (
                <div key={f.k} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "#ffffff44", letterSpacing: 2, marginBottom: 6 }}>{f.label}</div>
                  <input value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.ph}
                    style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", padding: "12px 14px", fontSize: 14, fontFamily: FONT, outline: "none" }} />
                </div>
              ))}
              <button onClick={submit} style={{ width: "100%", marginTop: 8, background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#0a0a0f", border: "none", borderRadius: 8, padding: "14px", fontFamily: MONO, fontWeight: "bold", fontSize: 12, letterSpacing: 2, cursor: "pointer", boxShadow: "0 0 30px rgba(255,215,0,0.3)" }}>SEND IT →</button>
              <div style={{ fontSize: 10, color: "#ffffff33", textAlign: "center", marginTop: 12 }}>Name + phone or email required</div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#00ff88", marginBottom: 8 }}>You're in.</div>
              <div style={{ fontSize: 12, color: "#ffffff66", marginBottom: 24, lineHeight: 1.6 }}>We've got your info and we'll be in touch fast.</div>
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "12px 28px", fontFamily: MONO, fontWeight: "bold", fontSize: 11, letterSpacing: 2, cursor: "pointer" }}>CLOSE</button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);
  const [scanText, setScanText] = useState("AUDIT →");
  const [modalOpen, setModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);

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
    if (!loading) { setScanText("AUDIT →"); return; }
    const steps = ["LOCATING...", "SCANNING...", "ANALYZING...", "COMPARING...", "SCORING..."];
    let i = 0;
    const interval = setInterval(() => {
      setScanText(steps[i % steps.length]);
      i++;
    }, 600);
    return () => clearInterval(interval);
  }, [loading]);

  const handleLead = (form) => {
    const lead = { ...form, ts: new Date().toISOString() };
    setLeads(prev => [...prev, lead]);
    // TODO[BACKEND]: POST this lead to your store. Pick one:
    //   • Google Sheets → Apps Script web app URL (fetch POST)
    //   • Zapier        → Catch Hook webhook URL
    //   • Supabase      → insert into leads table
    //   • Airtable      → REST API
    // Example: fetch("YOUR_WEBHOOK_URL", { method: "POST", body: JSON.stringify(lead) });
    console.log("NEW LEAD (wire me to backend):", lead);
  };

  const runAudit = async () => {
    if (!query.trim() || !mapsReady) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { places } = await window.google.maps.places.Place.searchByText({
        textQuery: query,
        fields: ["id", "displayName", "formattedAddress", "rating",
          "userRatingCount", "regularOpeningHours", "photos",
          "websiteURI", "nationalPhoneNumber", "location", "primaryType", "types"],
      });

      if (!places || places.length === 0) {
        setError("No business found. Try adding city/state.");
        setLoading(false);
        return;
      }

      const place = places[0];
      const rating = place.rating || 0;
      const reviewCount = place.userRatingCount || 0;
      const photoCount = place.photos ? place.photos.length : 0;
      const hasHours = !!place.regularOpeningHours;
      const hasWebsite = !!place.websiteURI;
      const hasPhone = !!place.nationalPhoneNumber;

      // ---- REAL competitor pull: nearby businesses of same type ----
      let comp = null;
      try {
        const typeKeyword = place.primaryType || (place.types && place.types[0]) || "";
        if (place.location && typeKeyword) {
          const { places: nearby } = await window.google.maps.places.Place.searchByText({
            textQuery: `${typeKeyword.replace(/_/g, " ")} near ${place.formattedAddress}`,
            fields: ["displayName", "rating", "userRatingCount"],
            maxResultCount: 8,
          });
          const others = (nearby || []).filter(p => p.displayName !== place.displayName && p.userRatingCount > 0);
          if (others.length) {
            const avgRating = others.reduce((s, p) => s + (p.rating || 0), 0) / others.length;
            const avgReviews = Math.round(others.reduce((s, p) => s + (p.userRatingCount || 0), 0) / others.length);
            let pressure = "LOW";
            const behind = (rating < avgRating ? 1 : 0) + (reviewCount < avgReviews ? 1 : 0);
            if (behind === 2) pressure = "HIGH";
            else if (behind === 1) pressure = "MODERATE";
            comp = { avgRating, avgReviews, count: others.length, yourRating: rating, yourReviews: reviewCount, pressure };
          }
        }
      } catch (e) { /* competitor pull optional — never blocks the audit */ }

      let score = 0;
      const issues = [];

      if (rating >= 4.5) score += 30;
      else if (rating >= 4.0) score += 22;
      else if (rating >= 3.5) score += 14;
      else { score += 5; issues.push({ text: "LOW RATING", level: "critical" }); }

      if (reviewCount >= 100) score += 25;
      else if (reviewCount >= 50) score += 18;
      else if (reviewCount >= 20) score += 12;
      else if (reviewCount >= 5) score += 6;
      else issues.push({ text: "FEW REVIEWS", level: "critical" });

      if (photoCount >= 10) score += 15;
      else if (photoCount >= 5) score += 10;
      else if (photoCount >= 1) score += 5;
      else issues.push({ text: "NO PHOTOS", level: "critical" });

      if (hasHours) score += 10;
      else issues.push({ text: "NO HOURS LISTED", level: "warning" });

      if (hasWebsite) score += 10;
      else issues.push({ text: "NO WEBSITE LINKED", level: "warning" });

      if (hasPhone) score += 10;
      else issues.push({ text: "NO PHONE NUMBER", level: "warning" });

      // competitor-based finding (real)
      if (comp) {
        if (comp.pressure === "HIGH" || comp.yourReviews < comp.avgReviews) {
          issues.push({ text: "BEHIND COMPETITORS", level: comp.pressure === "HIGH" ? "critical" : "warning" });
        } else {
          issues.push({ text: "AHEAD OF COMPETITORS", level: "ok" });
        }
      }

      if (rating >= 4.5) issues.push({ text: "STRONG RATING", level: "ok" });
      if (reviewCount >= 50) issues.push({ text: "GOOD REVIEW VOLUME", level: "ok" });
      if (hasWebsite) issues.push({ text: "WEBSITE LINKED", level: "ok" });
      if (photoCount >= 10) issues.push({ text: "PHOTOS STRONG", level: "ok" });

      // ---- Build ranked Action Plan from REAL gaps ----
      const plan = [];
      if (comp && comp.yourReviews < comp.avgReviews) {
        plan.push({ title: "Increase review velocity", impact: "HIGH", why: `Nearby competitors average ${comp.avgReviews} reviews vs your ${reviewCount}. Closing this gap can strengthen local trust.`, action: "Send automated review requests by text after every completed job or sale." });
      }
      if (reviewCount < 20 && !(comp && comp.yourReviews < comp.avgReviews)) {
        plan.push({ title: "Build your review base", impact: "HIGH", why: "A thin review count limits how trusted your profile looks to new customers.", action: "Start a consistent review request flow to steadily grow your count." });
      }
      if (rating < 4.0) {
        plan.push({ title: "Lift your star rating", impact: "HIGH", why: "A rating under 4.0 can turn customers away before they visit.", action: "Respond to every review and route happy customers to leave feedback." });
      }
      if (photoCount < 5) {
        plan.push({ title: "Add profile photos", impact: "MEDIUM", why: "Listings with more photos tend to get more clicks and direction requests.", action: "Upload fresh photos of your work, team, and location monthly." });
      }
      if (!hasHours) plan.push({ title: "Complete your hours", impact: "MEDIUM", why: "Missing hours can send customers to a competitor.", action: "Add full business hours, including holiday hours." });
      if (!hasWebsite) plan.push({ title: "Link your website", impact: "MEDIUM", why: "No website link can lower perceived credibility.", action: "Add your website or a simple landing page to your profile." });
      if (!hasPhone) plan.push({ title: "Add a phone number", impact: "MEDIUM", why: "Customers need a fast way to reach you.", action: "Add a primary phone number to your profile." });
      if (plan.length === 0) {
        plan.push({ title: "Defend your lead", impact: "LOW", why: "Your profile is strong. Consistency keeps you ahead.", action: "Keep collecting reviews and posting updates to protect your ranking." });
      }
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      plan.sort((a, b) => order[a.impact] - order[b.impact]);
      const topPlan = plan.slice(0, 5);

      setResult({ name: place.displayName, address: place.formattedAddress, rating, reviewCount, photoCount, score, issues, hasHours, hasWebsite, hasPhone, comp, plan: topPlan });
    } catch (e) {
      setError("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#e0e0e0", fontFamily: FONT, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes reveal { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(255,215,0,0.15)} 50%{box-shadow:0 0 35px rgba(255,215,0,0.3)} }
        input::placeholder{color:#ffffff33}
        input:focus{border-color:rgba(255,215,0,0.5) !important; box-shadow:0 0 20px rgba(255,215,0,0.15) !important}
        .reveal{animation:reveal 0.6s cubic-bezier(0.16,1,0.3,1) both}
        .hover-lift{transition:transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s, border-color 0.25s}
        .hover-lift:hover{transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,0,0,0.5), 0 0 30px rgba(255,215,0,0.08); border-color:rgba(255,215,0,0.2)}
        .glow-btn{transition:transform 0.2s, box-shadow 0.3s}
        .glow-btn:hover{transform:translateY(-2px) scale(1.02); box-shadow:0 0 50px rgba(255,215,0,0.5) !important}
        .glow-btn:active{transform:scale(0.98)}
        .audit-btn:hover:not(:disabled){transform:scale(1.03); box-shadow:0 0 40px rgba(255,215,0,0.5) !important}
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; background: #fff !important; }
          * { color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)", top: -200, right: -100, animation: "float 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(170,59,255,0.05) 0%, transparent 70%)", bottom: -100, left: -100, animation: "float 10s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)", top: "40%", left: "30%", animation: "float 12s ease-in-out infinite" }} />
      </div>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div style={{ position: "relative", zIndex: 1, padding: "28px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)", background: "rgba(8,8,16,0.8)" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: "bold", letterSpacing: 4, fontFamily: MONO, background: "linear-gradient(135deg, #ffd700, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>REPBLAZE</div>
          <div style={{ fontSize: 11, color: "#ffffffaa", letterSpacing: 3, marginTop: 4, fontFamily: MONO }}>GOOGLE BUSINESS PROFILE INTELLIGENCE</div>
        </div>
        {!mapsReady && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffd700", boxShadow: "0 0 10px #ffd700", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 9, color: "#ffffff44", letterSpacing: 2 }}>LOADING</span>
          </div>
        )}
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 740, margin: "60px auto 0", padding: "0 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 42, fontWeight: "bold", margin: "0 0 12px", background: "linear-gradient(135deg, #fff 0%, #ffffff88 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1, lineHeight: 1.1 }}>
            Is Your Google Profile<br />
            <span style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Costing You Customers?</span>
          </h1>
          <p style={{ color: "#ffffff44", fontSize: 13, letterSpacing: 1 }}>Free instant audit · No signup · Real data from Google</p>
        </div>

        <GlassCard glow className="no-print" style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#ffffff44", letterSpacing: 2, marginBottom: 12 }}>BUSINESS NAME + CITY / STATE</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runAudit()}
              placeholder="Search any local business…"
              style={{ flex: 1, minWidth: 200, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "16px 18px", fontSize: 15, fontFamily: FONT, outline: "none", transition: "all 0.3s" }}
            />
            <button onClick={runAudit} disabled={loading || !mapsReady} className="audit-btn"
              style={{ background: mapsReady ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "rgba(255,255,255,0.1)", color: mapsReady ? "#0a0a0f" : "#ffffff44", border: "none", borderRadius: 10, padding: "16px 28px", fontFamily: MONO, fontWeight: "bold", fontSize: 11, letterSpacing: 2, cursor: mapsReady ? "pointer" : "not-allowed", whiteSpace: "nowrap", minWidth: 130, boxShadow: mapsReady ? "0 0 30px rgba(255,215,0,0.3)" : "none", transition: "all 0.3s" }}>
              {scanText}
            </button>
          </div>
          {error && <div style={{ marginTop: 12, color: "#ff4444", fontSize: 12, letterSpacing: 1 }}>⚠ {error}</div>}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 16 }}>
            {["Free instant scan", "No signup", "Real Google data", "Built for local"].map(t => (
              <span key={t} style={{ fontSize: 10, color: "#ffffff44", letterSpacing: 1, display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: "#00ff88" }}>✓</span>{t}</span>
            ))}
          </div>
        </GlassCard>

        {loading && (
          <GlassCard style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: "#ffd700", letterSpacing: 3, marginBottom: 16 }}>{scanText}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ width: 4, height: 20, borderRadius: 2, background: "linear-gradient(#ffd700, #ff8c00)", animation: `pulse 1s ease-in-out ${i * 0.15}s infinite`, boxShadow: "0 0 8px rgba(255,215,0,0.5)" }} />
              ))}
            </div>
          </GlassCard>
        )}

        {!loading && !result && !error && (
          <div style={{ textAlign: "center", color: "#ffffff22", fontSize: 12, letterSpacing: 1, padding: "20px 0" }}>
            ↑ Enter a business name and city to run a free audit
          </div>
        )}

        {result && (
          <div>
            {/* Print-only report header */}
            <div className="print-only" style={{ display: "none", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #ffd700" }}>
              <div style={{ fontSize: 22, fontWeight: "bold", fontFamily: MONO, letterSpacing: 3 }}>REPBLAZE AUDIT REPORT</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>{result.name} · Generated {new Date().toLocaleDateString()}</div>
            </div>

            {/* Score + name */}
            <GlassCard className="reveal hover-lift" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 6 }}>{result.name}</div>
                <div style={{ fontSize: 11, color: "#ffffff33", letterSpacing: 1, marginBottom: 16 }}>{result.address}</div>
                <div style={{ fontSize: 12, color: "#ffffff66", lineHeight: 1.7 }}>
                  {result.score < 50 && "⚠ Your profile has critical gaps that may be costing you customers and visibility."}
                  {result.score >= 50 && result.score < 80 && "◆ Your profile has room to grow. Fixing these issues can help strengthen your local presence."}
                  {result.score >= 80 && "✓ Strong profile. Let's protect your position and keep the reviews coming."}
                </div>
              </div>
              <ScoreRing score={result.score} />
            </GlassCard>

            {/* Real competitor comparison */}
            {result.comp && <CompetitorBox comp={result.comp} />}

            {/* Metrics */}
            <GlassCard className="reveal hover-lift" style={{ marginBottom: 20, animationDelay: "0.15s" }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#ffffff33", marginBottom: 20, fontFamily: MONO }}>PROFILE METRICS — REAL DATA</div>
              <StatBar label="STAR RATING" value={result.rating} max={5} decimals={1} color={result.rating >= 4 ? "#00ff88" : result.rating >= 3 ? "#ffd700" : "#ff4444"} />
              <StatBar label="TOTAL REVIEWS" value={result.reviewCount} max={200} color="#ffd700" />
              <StatBar label="PHOTOS UPLOADED" value={result.photoCount} max={20} color="#00aaff" />
              <StatBar label="PROFILE COMPLETENESS" value={[result.rating > 0, result.reviewCount > 0, result.photoCount > 0, result.hasHours, result.hasWebsite, result.hasPhone].filter(Boolean).length} max={6} display={`${[result.rating > 0, result.reviewCount > 0, result.photoCount > 0, result.hasHours, result.hasWebsite, result.hasPhone].filter(Boolean).length}/6`} color="#aa88ff" />
            </GlassCard>

            {/* Action plan from real gaps */}
            <ActionPlan plan={result.plan} />

            {/* Issue cards - expandable */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#ffffff33", marginBottom: 16 }}>AUDIT FINDINGS — TAP TO EXPAND</div>
              {result.issues.map((i, idx) => <IssueCard key={idx} text={i.text} level={i.level} />)}
            </div>

            {/* CTA */}
            <GlassCard glow className="reveal no-print" style={{ textAlign: "center", border: "1px solid rgba(255,215,0,0.2)", animationDelay: "0.3s" }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#ffd700", marginBottom: 10, fontFamily: MONO }}>WANT REPBLAZE TO FIX THIS FOR YOU?</div>
              <div style={{ fontSize: 15, color: "#ffffff88", marginBottom: 24, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 24px" }}>
                We manage your Google profile, automate review collection, respond to every review, and track competitors — so you can focus on running your business.
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setModalOpen(true)} className="glow-btn"
                  style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#0a0a0f", padding: "16px 36px", borderRadius: 10, fontFamily: MONO, fontWeight: "bold", fontSize: 12, letterSpacing: 2, border: "none", cursor: "pointer", boxShadow: "0 0 40px rgba(255,215,0,0.3)" }}>
                  ACTIVATE REPBLAZE →
                </button>
                <button onClick={() => window.print()}
                  style={{ background: "rgba(255,255,255,0.06)", color: "#fff", padding: "16px 28px", borderRadius: 10, fontFamily: MONO, fontWeight: "bold", fontSize: 12, letterSpacing: 2, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.25s" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}>
                  ↓ DOWNLOAD REPORT
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <LeadModal open={modalOpen} onClose={() => setModalOpen(false)} businessName={result?.name} onSubmit={handleLead} />
    </div>
  );
}
