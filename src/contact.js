/*
 * Public contact details shown as the fallback when the lead form can't send.
 * Set these in Vercel (Project → Settings → Environment Variables) before launch:
 *   VITE_CONTACT_PHONE   e.g. (816) 555-0100   ← Charlie must supply; no number is shown until set
 *   VITE_CONTACT_EMAIL   defaults to the lead-notification inbox below
 */
const phone = (import.meta.env.VITE_CONTACT_PHONE || "").trim();
const digits = phone.replace(/[^\d+]/g, "");

export const CONTACT = {
  phone,
  tel: digits ? `tel:${digits}` : "",
  sms: digits ? `sms:${digits}` : "",
  email: (import.meta.env.VITE_CONTACT_EMAIL || "prouddaddy880810@gmail.com").trim(),
};
