# RepBlaze — Agent Rules

## Active project boundary
Work only in `prouddaddy880810-byte/repblaze` and the RepBlaze Supabase project unless Charlie explicitly authorizes cross-project work.

READ ACROSS. WRITE LOCAL.

Do not modify I&M, Charlie Blaze, or other client projects while RepBlaze is active.

## Operating loop
UNDERSTAND → INSPECT → REUSE → PLAN → BUILD → TEST → BUG HUNT → REGRESSION CHECK → FUTURE-PROOF CHECK → VERIFY → MEASURE → DOCUMENT → SHIP.

## Business priority
Revenue-generating and lead-capture reliability outrank cosmetic work.

Before adding features, confirm the customer journey and business result the feature is meant to improve.

## Current launch priority
Prove this path end to end:
traffic source → landing page → audit/CTA → lead form → Supabase persistence → attribution → follow-up → owner visibility.

Do not call the landing page launch-ready until that path is verified.

## Preservation rules
- Protect working audit and landing-page flows.
- Prefer small reversible changes.
- Do not rewrite stable architecture without cause.
- Supabase is the source of truth for lead data.
- Do not expose service-role/secret keys in browser code.
- Capture source/campaign/session data at lead creation.
- Keep test leads explicitly marked and excluded from real KPIs.

## Future-proofing rule
Prepare interfaces, data, configuration, and architecture for probable future needs. Do not implement speculative features without a current business requirement.

Build multi-client likely values as configuration rather than hard-coded values when practical.

## Reuse rule
Proven capabilities should be classified as either RepBlaze-specific or reusable Dream Chasers module candidates. Do not automatically move code between repos.
