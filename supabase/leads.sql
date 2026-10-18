-- ============================================================
-- RepBlaze leads table
-- Run once in the SQL editor of a NEW Supabase project created for RepBlaze
-- (do NOT run this in the "Maintenance portal" project).
--
-- Security model:
--   * The website never talks to Supabase directly any more.
--   * /api/lead (Vercel function) inserts with SUPABASE_SERVICE_ROLE_KEY,
--     which bypasses RLS, so anon/authenticated get NO policies at all.
--   * RLS is enabled and forced, so a leaked anon/publishable key can't
--     read or write leads.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  -- contact
  name             text not null check (char_length(name) between 1 and 120),
  business_name    text check (char_length(business_name) <= 160),
  phone            text check (char_length(phone) <= 40),
  email            text check (char_length(email) <= 254),
  notes            text check (char_length(notes) <= 2000),

  -- attribution
  source           text check (char_length(source) <= 120),
  medium           text check (char_length(medium) <= 120),
  campaign         text check (char_length(campaign) <= 160),
  content          text check (char_length(content) <= 160),
  term             text check (char_length(term) <= 160),
  landing_page     text check (char_length(landing_page) <= 500),
  referrer         text check (char_length(referrer) <= 500),

  -- audit context
  audited_business text check (char_length(audited_business) <= 160),
  audit_score      smallint check (audit_score between 0 and 100),

  -- consent (TCPA / CAN-SPAM record)
  consent_sms      boolean not null default false,
  consent_email    boolean not null default false,

  -- idempotency: a retried submission with the same id returns 409, not a duplicate row
  session_id       text unique check (char_length(session_id) <= 80),

  -- workflow
  status           text not null default 'new'
                   check (status in ('new','contacted','qualified','won','lost','spam')),

  constraint leads_contact_required check (phone is not null or email is not null),
  constraint leads_sms_consent check (phone is null or consent_sms),
  constraint leads_email_consent check (email is null or consent_email)
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

alter table public.leads enable row level security;
alter table public.leads force row level security;

-- No policies for anon/authenticated on purpose: only the service role (server) can touch this table.
revoke all on table public.leads from anon, authenticated;

-- ------------------------------------------------------------
-- OPTIONAL (not recommended): if you ever go back to posting straight from the
-- browser with the anon key, use an insert-only policy like this instead:
--
--   grant insert on table public.leads to anon;
--   create policy "anon can insert leads" on public.leads
--     for insert to anon
--     with check (status = 'new');
--
-- (no select/update/delete policy, so anon still can't read anything back)
-- ------------------------------------------------------------
