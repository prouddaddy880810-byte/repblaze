import { useState } from "react";

/* ---------- shared bits ---------- */
function Stars({ value = 0, size = 14 }) {
  return (
    <span className="gp-stars" aria-hidden="true" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? "on" : ""}>★</span>
      ))}
    </span>
  );
}

function ProfileCard({ variant }) {
  const after = variant === "after";
  return (
    <div className={`gp-card ${after ? "gp-after" : "gp-before"}`} aria-hidden="true">
      <div className="gp-photos">
        {after ? (
          <>
            <img src="/photos/auto-repair-owner.jpg" alt="" loading="lazy" />
            <img src="/photos/happy-customer-checkout.jpg" alt="" loading="lazy" />
          </>
        ) : (
          <div className="gp-nophoto"><span>No photos yet</span></div>
        )}
      </div>
      <div className="gp-body">
        <div className="gp-name">Main Street Auto Repair</div>
        <div className="gp-rating">
          <b>4.2</b> <Stars value={4.2} /> <span>(14)</span>
          <span className="gp-dot">·</span> Auto repair shop
        </div>
        <div className={`gp-hours ${after ? "ok" : "missing"}`}>
          {after ? <><b>Open</b> · Closes 6 PM</> : "Hours not listed"}
        </div>
        <div className="gp-actions">
          <span className={after ? "" : "dim"}>Website</span>
          <span>Call</span>
          <span>Directions</span>
        </div>
        <div className="gp-review">
          <div className="gp-review-head"><b>Sam R.</b> <Stars value={5} size={11} /></div>
          <p>Fixed my brakes same day and explained everything.</p>
          {after ? (
            <div className="gp-reply"><b>Owner reply:</b> Thanks, Sam! Glad we got you back on the road.</div>
          ) : (
            <div className="gp-noreply">No owner reply</div>
          )}
        </div>
        {after && <div className="gp-post"><b>Update</b> · Winter tire swaps are on the schedule — call to book.</div>}
      </div>
    </div>
  );
}

/* ---------- interactive before/after Google profile slider ---------- */
export function BeforeAfterProfile() {
  const [pos, setPos] = useState(50);
  return (
    <figure className="ba">
      <div className="ba-stage" style={{ "--pos": `${pos}%` }}>
        <div className="ba-layer ba-layer-after"><ProfileCard variant="after" /></div>
        <div className="ba-layer ba-layer-before"><ProfileCard variant="before" /></div>
        <span className="ba-tag ba-tag-before">Before</span>
        <span className="ba-tag ba-tag-after">After</span>
        <div className="ba-handle" aria-hidden="true"><span>⟷</span></div>
        <input
          className="ba-range"
          type="range"
          min="0"
          max="100"
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Compare an incomplete profile with a complete one"
        />
      </div>
      <figcaption>
        Illustration with an invented example business, not a real client or result. Same shop, same reviews. The difference is a
        complete, active profile: photos, hours, owner replies and fresh updates.
      </figcaption>
    </figure>
  );
}

/* ---------- interactive review-star demo (no review gating) ---------- */
export function ReviewStarDemo() {
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const shown = hover || picked;
  const labels = ["", "Not good", "Could be better", "It was okay", "Really good", "Excellent"];

  return (
    <div className="star-demo">
      <div className="phone" role="group" aria-label="Example review request text message">
        <div className="phone-top"><span>Main Street Auto Repair</span><small>Example</small></div>
        <div className="bubble in">
          Hi Sam, thanks for choosing Main Street Auto Repair today! How did we do? Your honest feedback helps other folks in town.
        </div>
        <div className="star-row" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= shown ? "on" : ""}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(0)}
              onClick={() => setPicked(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={picked === n}
            >
              ★
            </button>
          ))}
        </div>
        <div className="star-label" aria-live="polite">{shown ? labels[shown] : "Tap a star to try it"}</div>
        {picked > 0 && (
          <div className="bubble in pop" key={picked}>
            Thank you! Here’s the link to leave a public Google review: <u>g.page/r/example</u>
          </div>
        )}
      </div>
      <div className="owner-side" aria-live="polite">
        <div className="eyebrow orange">What the owner sees</div>
        {picked === 0 && <p className="owner-note idle">Pick a rating on the phone to see what happens next.</p>}
        {picked > 0 && picked <= 3 && (
          <p className="owner-note alert" key={`a${picked}`}>
            <b>Heads-up:</b> Sam rated the visit {picked}★. A follow-up task is ready so you can call and make it right.
          </p>
        )}
        {picked >= 4 && (
          <p className="owner-note good" key={`g${picked}`}>
            <b>Nice:</b> Sam rated the visit {picked}★. If a public review comes in, a reply is drafted for you to approve.
          </p>
        )}
        <p className="owner-fine">
          Every customer gets the same review link, whatever they pick. We never filter out unhappy customers. That goes against
          Google’s rules, and it isn’t how trust gets built.
        </p>
      </div>
    </div>
  );
}
