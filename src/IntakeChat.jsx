import { useState, useEffect, useRef } from "react";
import { CONTACT } from "./contact.js";
import "./intake-chat.css";

/* Scripted intake chat. No AI: fixed questions, no prices, no promises. */
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const HELP = ["Google profile", "Reviews", "A new website", "Something else"];
const TIMING = ["As soon as possible", "In the next month", "Just exploring"];

const cityFrom = (address) => {
  if (!address) return "";
  const parts = address.split(",").map((s) => s.trim());
  // "123 Main St, St Joseph, MO 64501, USA" -> "St Joseph, MO"
  if (parts.length >= 3) return `${parts[parts.length - 3]}, ${parts[parts.length - 2].replace(/\s*\d{5}(-\d{4})?$/, "")}`;
  return "";
};

export default function IntakeChat({ open, setOpen, audit, onSubmit }) {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState([]);
  const [a, setA] = useState({ business: "", city: "", help: [], other: "", timing: "", name: "", phone: "", email: "", consentSms: false, consentEmail: false, website: "" });
  const [draft, setDraft] = useState({});
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sidValue] = useState(newId);
  const sid = useRef(sidValue);
  const bodyRef = useRef(null);
  const started = useRef(false);

  const bot = (text) => setLog((l) => [...l, { who: "bot", text }]);
  const me = (text) => setLog((l) => [...l, { who: "me", text }]);

  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    const city = cityFrom(audit?.address);
    setDraft({ business: audit?.name || "", city });
    bot(audit?.name
      ? `Hi! Thanks for running the free audit for ${audit.name}. A few quick questions so Charlie can follow up with you.`
      : "Hi! I'm the RepBlaze intake assistant. A few quick questions so Charlie can follow up with you.");
    bot("What's your business name and city?");
  }, [open, audit]);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [log, step]);

  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, setOpen]);

  const next1 = () => {
    if (!draft.business?.trim()) return setErr("Add your business name.");
    setErr(""); setA((x) => ({ ...x, business: draft.business.trim(), city: (draft.city || "").trim() }));
    me([draft.business.trim(), draft.city?.trim()].filter(Boolean).join(" · "));
    bot("Great. What would you like help with? Pick any that apply.");
    setStep(1);
  };
  const next2 = () => {
    if (!a.help.length) return setErr("Pick at least one.");
    if (a.help.includes("Something else") && !a.other.trim()) return setErr("Tell us a little about what you need.");
    setErr(""); me(a.help.map((h) => (h === "Something else" ? `Something else: ${a.other.trim()}` : h)).join(", "));
    bot("Got it. When are you hoping to get started?");
    setStep(2);
  };
  const pickTiming = (t) => {
    setA((x) => ({ ...x, timing: t })); me(t);
    bot("Last step: who should Charlie ask for, and how can he reach you? A phone, an email, or both.");
    setStep(3);
  };

  const submit = async () => {
    if (sending) return;
    const phone = a.phone.trim(), email = a.email.trim();
    if (!a.name.trim()) return setErr("Enter your name so we know who to ask for.");
    if (!phone && !email) return setErr("Add a phone or email so we can reach you.");
    if (phone && !a.consentSms) return setErr("Please confirm we may text you, or remove the phone number.");
    if (email && !a.consentEmail) return setErr("Please confirm we may email you, or remove the email address.");
    setErr(""); setFailed(false); setSending(true);
    const notes = [
      "Intake chat answers",
      `Business: ${a.business}`,
      a.city && `City: ${a.city}`,
      `Wants help with: ${a.help.map((h) => (h === "Something else" ? `Something else (${a.other.trim()})` : h)).join(", ")}`,
      `Timing: ${a.timing}`,
    ].filter(Boolean).join("\n");
    try {
      await onSubmit({
        name: a.name, business: a.business, phone, email, notes, website: a.website,
        consentSms: a.consentSms, consentEmail: a.consentEmail, submissionId: sid.current, source: "intake_chat",
      });
      me(`${a.name.trim()} · ${[phone, email].filter(Boolean).join(" · ")}`);
      bot(`Thanks, ${a.name.trim().split(" ")[0]}! Your info is in. Expect a call or text from Charlie soon${email && !phone ? " (or an email)" : ""}.`);
      setStep(4);
    } catch (e) {
      if (e?.fields) setErr(Object.values(e.fields)[0]);
      else { setFailed(true); setErr("That didn't send. Please try again."); }
    }
    setSending(false);
  };

  const toggleHelp = (h) => setA((x) => ({ ...x, help: x.help.includes(h) ? x.help.filter((y) => y !== h) : [...x.help, h] }));

  return (
    <div className="no-print">
      {!open && (
        <button className="ic-bubble" onClick={() => setOpen(true)} aria-label="Open chat with RepBlaze">
          <img src="/brand/flame-icon.png" alt="" width="30" height="30" />
          <span>Questions? Chat</span>
        </button>
      )}
      {open && (
        <section className="ic-panel" role="dialog" aria-label="RepBlaze intake chat">
          <header className="ic-head">
            <img src="/brand/flame-icon.png" alt="" width="34" height="34" />
            <div><b>Rep<span className="flame-text">Blaze</span></b><small>Usually replies by call or text</small></div>
            <button className="ic-x" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </header>
          <div className="ic-body" ref={bodyRef}>
            {log.map((m, i) => <div key={i} className={`ic-msg ic-${m.who}`}>{m.text}</div>)}
          </div>
          <div className="ic-input">
            {step === 0 && (<>
              <input className="ic-field" placeholder="Business name" value={draft.business || ""} onChange={(e) => setDraft({ ...draft, business: e.target.value })} autoFocus />
              <input className="ic-field" placeholder="City, state" value={draft.city || ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} onKeyDown={(e) => e.key === "Enter" && next1()} />
              <button className="btn-primary ic-go" onClick={next1}>Next</button>
            </>)}
            {step === 1 && (<>
              <div className="ic-chips">{HELP.map((h) => <button key={h} className={`ic-chip ${a.help.includes(h) ? "on" : ""}`} aria-pressed={a.help.includes(h)} onClick={() => toggleHelp(h)}>{h}</button>)}</div>
              {a.help.includes("Something else") && <input className="ic-field" placeholder="What do you need?" value={a.other} onChange={(e) => setA({ ...a, other: e.target.value })} />}
              <button className="btn-primary ic-go" onClick={next2}>Next</button>
            </>)}
            {step === 2 && <div className="ic-chips">{TIMING.map((t) => <button key={t} className="ic-chip" onClick={() => pickTiming(t)}>{t}</button>)}</div>}
            {step === 3 && (<>
              <input className="ic-field" placeholder="Your name" autoComplete="name" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} />
              <input className="ic-field" placeholder="Phone" type="tel" autoComplete="tel" value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} />
              <input className="ic-field" placeholder="Email" type="email" autoComplete="email" value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} />
              <input className="ic-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={a.website} onChange={(e) => setA({ ...a, website: e.target.value })} />
              {a.phone.trim() && <label className="consent-row"><input type="checkbox" checked={a.consentSms} onChange={(e) => setA({ ...a, consentSms: e.target.checked })} /><span>RepBlaze may text me about this request. Message and data rates may apply. Reply STOP to opt out.</span></label>}
              {a.email.trim() && <label className="consent-row"><input type="checkbox" checked={a.consentEmail} onChange={(e) => setA({ ...a, consentEmail: e.target.checked })} /><span>RepBlaze may email me about this request. I can unsubscribe at any time.</span></label>}
              <button className="btn-primary ic-go" onClick={submit} disabled={sending}>{sending ? "Sending…" : failed ? "Try again" : "Send"}</button>
              {failed && (CONTACT.phone || CONTACT.email) && <p className="ic-fallback">You can also reach us at {CONTACT.phone && <a href={CONTACT.tel}>{CONTACT.phone}</a>}{CONTACT.phone && CONTACT.email && " or "}{CONTACT.email && <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>}.</p>}
            </>)}
            {step === 4 && <button className="btn-primary ic-go" onClick={() => setOpen(false)}>Close</button>}
            {err && <div className="form-error" role="alert">{err}</div>}
          </div>
        </section>
      )}
    </div>
  );
}
