# RepBlaze landing page

React + Vite single page, deployed on Vercel. `/api/*.js` are Vercel serverless functions.

```
npm install
npm run dev          # http://localhost:5173 – also serves /api/lead and /api/scan locally
npm run build
npm run test:lead    # 15 offline tests for the lead route (Supabase + Resend mocked)
python3 scripts/screenshots.py http://localhost:5173/   # desktop 1440 + mobile 390 previews → screenshots/
```

## Lead capture (`/api/lead`)

The form posts to our own route instead of straight to Supabase from the browser. The route:

1. validates and sanitizes the fields (name, business, phone, email, notes, UTM/source, landing page, referrer,
   audit score, `consent_sms`, `consent_email`, `session_id`), rejects bad input with `422`;
2. drops bots silently via a hidden honeypot field (`website`);
3. rate-limits to 5 submissions per IP per 10 minutes (best effort, per warm function instance) → `429`;
4. **in parallel**: inserts into Supabase `leads` with the service-role key, **and** emails the lead via Resend;
5. returns `200 {ok, stored, notified}` if *either* worked, `502 DELIVERY_FAILED` only if *both* failed.
   On 502 the lead is also written to the Vercel function log as a last-resort copy, and the page shows
   call / text / email fallback buttons instead of a fake "sent".

Table + RLS: [`supabase/leads.sql`](supabase/leads.sql) (RLS on, no anon policies; only the server key can write).

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Where | Required | Notes |
|---|---|---|---|
| `SUPABASE_URL` | server | yes* | `https://<ref>.supabase.co` of a **new RepBlaze project** (not "Maintenance portal") |
| `SUPABASE_SERVICE_ROLE_KEY` | server, secret | yes* | Supabase → Project Settings → API → `service_role`. Never prefix with `VITE_` |
| `RESEND_API_KEY` | server, secret | yes* | resend.com → API Keys |
| `LEAD_NOTIFY_TO` | server | no | default `prouddaddy880810@gmail.com`; comma-separate for several |
| `LEAD_NOTIFY_FROM` | server | no | default `RepBlaze Leads <onboarding@resend.dev>` (Resend test sender: only delivers to the Resend account owner's own address). Use e.g. `RepBlaze <leads@yourdomain>` after verifying a domain in Resend |
| `SUPABASE_LEADS_TABLE` | server | no | default `leads` |
| `LEAD_ALLOWED_ORIGINS` | server | no | extra origins allowed to POST (custom domain), comma-separated |
| `VITE_CONTACT_PHONE` | client | strongly recommended | number shown on the failure fallback as Call / Text buttons. Not shown until set |
| `VITE_CONTACT_EMAIL` | client | no | fallback email link, default `prouddaddy880810@gmail.com` |

\* At least one channel must be configured or every submission returns 502 (with the fallback shown). Configure both.

The old `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are no longer used by the landing page.

## Content rules

No guaranteed sales or rankings, no invented testimonials / stats / client results, pricing not published.
Example businesses ("Main Street Auto Repair", …) are labeled as examples. Photo licenses: [`public/photos/CREDITS.md`](public/photos/CREDITS.md).
