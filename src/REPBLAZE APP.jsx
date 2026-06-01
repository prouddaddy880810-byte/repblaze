import { useState, useEffect } from "react";

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

function ScoreRing({ score }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
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
          transform="rotate(-90 70 70)"
          filter="url(#glow)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        <text x="70" y="62" textAnchor="middle" fill={color} fontSize="30"
          fontFamily="'Courier New', monospace" fontWeight="bold" filter="url(#glow)">{score}</text>
        <text x="70" y="80" textAnchor="middle" fill="#ffffff66" fontSize="9"
          fontFamily="'Courier New', monospace" letterSpacing="3">OUT OF 100</text>
        <text x="70" y="96" textAnchor="middle" fill={color} fontSize="9"
          fontFamily="'Courier New', monospace" letterSpacing="2" filter="url(#glow)">{scoreLabel(score)}</text>
      </svg>
    </div>
  );
}

function StatBar({ label, value, max, color = "#ffd700", prefix = "" }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#ffffff66", fontSize: 11, letterSpacing: 1.5, fontFamily: "monospace" }}>{label}</span>
        <span style={{ color, fontSize: 12, fontFamily: "monospace", fontWeight: "bold" }}>{prefix}{value}</span>
      </div>
      <div style={{ background: "#ffffff0a", borderRadius: 99, height: 6, overflow: "hidden", position: "relative" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 10px ${color}66`,
          transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)"
        }} />
      </div>
    </div>
  );
}

function IssueTag({ text, level }) {
  const configs = {
    critical: { color: "#ff4444", bg: "#ff444415", border: "#ff444440" },
    warning: { color: "#ffd700", bg: "#ffd70015", border: "#ffd70040" },
    ok: { color: "#00ff88", bg: "#00ff8815", border: "#00ff8840" }
  };
  const c = configs[level];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "5px 12px", borderRadius: 99,
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      fontSize: 10, fontFamily: "monospace", letterSpacing: 1.5,
      marginRight: 6, marginBottom: 8
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
      {text}
    </span>
  );
}

function GlassCard({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      backdropFilter: "blur(20px)",
      padding: 28,
      boxShadow: glow
        ? "0 0 40px rgba(255,215,0,0.08), 0 20px 60px rgba(0,0,0,0.4)"
        : "0 20px 60px rgba(0,0,0,0.3)",
      ...style
    }}>
      {children}
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
    const steps = ["LOCATING...", "SCANNING...", "ANALYZING...", "SCORING..."];
    let i = 0;
    const interval = setInterval(() => {
      setScanText(steps[i % steps.length]);
      i++;
    }, 600);
    return () => clearInterval(interval);
  }, [loading]);

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
          "websiteURI", "nationalPhoneNumber"],
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

      if (rating >= 4.5) issues.push({ text: "STRONG RATING", level: "ok" });
      if (reviewCount >= 50) issues.push({ text: "GOOD REVIEW VOLUME", level: "ok" });
      if (hasWebsite) issues.push({ text: "WEBSITE LINKED", level: "ok" });
      if (photoCount >= 10) issues.push({ text: "PHOTOS STRONG", level: "ok" });

      setResult({ name: place.displayName, address: place.formattedAddress, rating, reviewCount, photoCount, score, issues, hasHours, hasWebsite, hasPhone });
    } catch (e) {
      setError("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080810",
      color: "#e0e0e0",
      fontFamily: "'Courier New', monospace",
      position: "relative",
      overflow: "hidden"
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        input::placeholder{color:#ffffff33}
        input:focus{border-color:rgba(255,215,0,0.5) !important; box-shadow:0 0 20px rgba(255,215,0,0.1) !important}
      `}</style>

      {/* Animated background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)", top: -200, right: -100, animation: "float 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(170,59,255,0.05) 0%, transparent 70%)", bottom: -100, left: -100, animation: "float 10s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)", top: "40%", left: "30%", animation: "float 12s ease-in-out infinite" }} />
      </div>

      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, padding: "28px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)", background: "rgba(8,8,16,0.8)" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: "bold", letterSpacing: 4, background: "linear-gradient(135deg, #ffd700, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            REPBLAZE
          </div>
          <div style={{ fontSize: 9, color: "#ffffff33", letterSpacing: 3, marginTop: 2 }}>GOOGLE BUSINESS PROFILE INTELLIGENCE</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: mapsReady ? "#00ff88" : "#ffd700", boxShadow: mapsReady ? "0 0 10px #00ff88" : "0 0 10px #ffd700", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 9, color: "#ffffff44", letterSpacing: 2 }}>{mapsReady ? "ONLINE" : "LOADING"}</span>
        </div>
      </div>

      {/* Main */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 740, margin: "60px auto 0", padding: "0 24px" }}>

        {/* Hero text */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{
            fontSize: 42, fontWeight: "bold", margin: "0 0 12px",
            background: "linear-gradient(135deg, #fff 0%, #ffffff88 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: -1, lineHeight: 1.1
          }}>
            Is Your Google Profile<br />
            <span style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Costing You Customers?
            </span>
          </h1>
          <p style={{ color: "#ffffff44", fontSize: 13, letterSpacing: 1 }}>Free audit in seconds. No signup required.</p>
        </div>

        {/* Search card */}
        <GlassCard glow style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#ffffff44", letterSpacing: 2, marginBottom: 12 }}>BUSINESS NAME + CITY / STATE</div>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runAudit()}
              placeholder="Dream of Sneakerz, St Joseph MO"
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                color: "#fff", padding: "16px 18px", fontSize: 14,
                fontFamily: "monospace", outline: "none", transition: "all 0.3s"
              }}
            />
            <button onClick={runAudit} disabled={loading || !mapsReady}
              style={{
                background: mapsReady ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "rgba(255,255,255,0.1)",
                color: mapsReady ? "#0a0a0f" : "#ffffff44",
                border: "none", borderRadius: 10,
                padding: "16px 28px", fontFamily: "monospace",
                fontWeight: "bold", fontSize: 11, letterSpacing: 2,
                cursor: mapsReady ? "pointer" : "not-allowed",
                whiteSpace: "nowrap", minWidth: 130,
                boxShadow: mapsReady ? "0 0 30px rgba(255,215,0,0.3)" : "none",
                transition: "all 0.3s"
              }}>
              {scanText}
            </button>
          </div>
          {error && <div style={{ marginTop: 12, color: "#ff4444", fontSize: 12, letterSpacing: 1 }}>⚠ {error}</div>}
        </GlassCard>

        {/* Loading animation */}
        {loading && (
          <GlassCard style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: "#ffd700", letterSpacing: 3, marginBottom: 16 }}>{scanText}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{
                  width: 4, height: 20, borderRadius: 2,
                  background: "linear-gradient(#ffd700, #ff8c00)",
                  animation: `pulse 1s ease-in-out ${i * 0.15}s infinite`,
                  boxShadow: "0 0 8px rgba(255,215,0,0.5)"
                }} />
              ))}
            </div>
          </GlassCard>
        )}

        {/* Results */}
        {result && (
          <div style={{ animation: "float 0s" }}>
            {/* Score header */}
            <GlassCard style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 6, letterSpacing: -0.5 }}>{result.name}</div>
                <div style={{ fontSize: 11, color: "#ffffff33", letterSpacing: 1 }}>{result.address}</div>
                <div style={{ marginTop: 16 }}>
                  {result.issues.map((i, idx) => <IssueTag key={idx} text={i.text} level={i.level} />)}
                </div>
              </div>
              <ScoreRing score={result.score} />
            </GlassCard>

            {/* Metrics */}
            <GlassCard style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#ffffff33", marginBottom: 20 }}>PROFILE METRICS</div>
              <StatBar label="STAR RATING" value={result.rating} max={5}
                color={result.rating >= 4 ? "#00ff88" : result.rating >= 3 ? "#ffd700" : "#ff4444"} />
              <StatBar label="TOTAL REVIEWS" value={result.reviewCount} max={200} color="#ffd700" />
              <StatBar label="PHOTOS UPLOADED" value={result.photoCount} max={20} color="#00aaff" />
              <StatBar label="PROFILE COMPLETENESS"
                value={[result.rating > 0, result.reviewCount > 0, result.photoCount > 0, result.hasHours, result.hasWebsite, result.hasPhone].filter(Boolean).length}
                max={6} color="#aa88ff" />
            </GlassCard>

            {/* CTA */}
            <GlassCard glow style={{ textAlign: "center", border: "1px solid rgba(255,215,0,0.2)" }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#ffd700", marginBottom: 10 }}>READY TO DOMINATE YOUR LOCAL MARKET?</div>
              <div style={{ fontSize: 15, color: "#ffffff88", marginBottom: 24, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 24px" }}>
                RepBlaze manages your Google profile, automates review collection, and responds to every review — so you rank higher and win more customers.
              </div>
              <a href="mailto:digitalreputationsolution@gmail.com?subject=RepBlaze Free Consultation"
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                  color: "#0a0a0f", padding: "16px 36px", borderRadius: 10,
                  fontFamily: "monospace", fontWeight: "bold", fontSize: 12,
                  letterSpacing: 2, textDecoration: "none",
                  boxShadow: "0 0 40px rgba(255,215,0,0.3)"
                }}>
                GET A FREE CONSULT →
              </a>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
