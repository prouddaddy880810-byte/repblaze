import { useState, useEffect, useRef } from "react";

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
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1a1a2e" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28"
        fontFamily="'Courier New', monospace" fontWeight="bold">{score}</text>
      <text x="70" y="85" textAnchor="middle" fill={color} fontSize="10"
        fontFamily="'Courier New', monospace" letterSpacing="2">{scoreLabel(score)}</text>
    </svg>
  );
}

function StatBar({ label, value, max, color = "#ffd700" }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#888", fontSize: 11, letterSpacing: 1, fontFamily: "monospace" }}>{label}</span>
        <span style={{ color, fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}>{value}</span>
      </div>
      <div style={{ background: "#1a1a2e", borderRadius: 2, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function IssueTag({ text, level }) {
  const colors = { critical: "#ff4444", warning: "#ffd700", ok: "#00ff88" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 2,
      border: `1px solid ${colors[level]}`, color: colors[level],
      fontSize: 10, fontFamily: "monospace", letterSpacing: 1, marginRight: 6, marginBottom: 6
    }}>{text}</span>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    const check = setInterval(() => {
      if (window.__mapsReady && window.google?.maps?.places?.Place) {
        setMapsReady(true);
        clearInterval(check);
      }
    }, 200);
    return () => clearInterval(check);
  }, []);

  const runAudit = async () => {
    if (!query.trim()) return;
    if (!mapsReady) {
      setError("Google Maps still loading, try again in a second.");
      return;
    }
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

      setResult({
        name: place.displayName,
        address: place.formattedAddress,
        rating, reviewCount, photoCount,
        score, issues, hasHours, hasWebsite, hasPhone
      });
    } catch (e) {
      console.error(e);
      setError("Error fetching business data: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e0e0e0", fontFamily: "'Courier New', monospace", padding: "0 0 60px" }}>
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "24px 32px" }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#ffd700", letterSpacing: 3 }}>
          REP<span style={{ color: "#fff" }}>BLAZE</span>
        </div>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2 }}>GOOGLE BUSINESS PROFILE AUDITOR</div>
      </div>

      <div style={{ maxWidth: 700, margin: "48px auto 0", padding: "0 24px" }}>
        <div style={{ marginBottom: 8, fontSize: 11, color: "#555", letterSpacing: 2 }}>
          ENTER BUSINESS NAME + CITY {!mapsReady && <span style={{ color: "#ffd700" }}> — LOADING MAPS...</span>}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runAudit()}
            placeholder="Dream of Sneakerz, St Joseph MO"
            style={{
              flex: 1, background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: 3,
              color: "#e0e0e0", padding: "14px 16px", fontSize: 13, fontFamily: "monospace", outline: "none"
            }}
          />
          <button onClick={runAudit} disabled={loading || !mapsReady}
            style={{
              background: mapsReady ? "#ffd700" : "#555", color: "#0a0a0f", border: "none", borderRadius: 3,
              padding: "14px 28px", fontFamily: "monospace", fontWeight: "bold",
              fontSize: 12, letterSpacing: 2, cursor: mapsReady ? "pointer" : "not-allowed"
            }}>
            {loading ? "SCANNING..." : "AUDIT →"}
          </button>
        </div>

        {error && <div style={{ marginTop: 16, color: "#ff4444", fontSize: 12 }}>{error}</div>}

        {result && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 }}>{result.name}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{result.address}</div>
              </div>
              <ScoreRing score={result.score} />
            </div>

            <div style={{ marginBottom: 28 }}>
              {result.issues.map((i, idx) => <IssueTag key={idx} text={i.text} level={i.level} />)}
            </div>

            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 4, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#555", marginBottom: 16 }}>PROFILE METRICS</div>
              <StatBar label="STAR RATING" value={result.rating} max={5} color={result.rating >= 4 ? "#00ff88" : result.rating >= 3 ? "#ffd700" : "#ff4444"} />
              <StatBar label="TOTAL REVIEWS" value={result.reviewCount} max={200} color="#ffd700" />
              <StatBar label="PHOTOS UPLOADED" value={result.photoCount} max={20} color="#00aaff" />
              <StatBar label="PROFILE COMPLETENESS"
                value={[result.rating > 0, result.reviewCount > 0, result.photoCount > 0, result.hasHours, result.hasWebsite, result.hasPhone].filter(Boolean).length}
                max={6} color="#aa88ff" />
            </div>

            <div style={{ background: "#0f0f1a", border: "1px solid #ffd700", borderRadius: 4, padding: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#ffd700", marginBottom: 8 }}>WANT THIS FIXED?</div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16, lineHeight: 1.6 }}>
                RepBlaze manages your Google profile, automates review requests, and responds to every review — so you focus on running your business.
              </div>
              <a href="mailto:digitalreputationsolution@gmail.com?subject=RepBlaze Audit Inquiry"
                style={{
                  display: "inline-block", background: "#ffd700", color: "#0a0a0f",
                  padding: "12px 24px", borderRadius: 3, fontFamily: "monospace",
                  fontWeight: "bold", fontSize: 11, letterSpacing: 2, textDecoration: "none"
                }}>
                GET A FREE CONSULT →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


