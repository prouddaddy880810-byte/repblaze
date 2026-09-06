# Current State — 2026-09-06

## Landing page
The current main branch contains the redesigned RepBlaze landing page and live audit flow.

## Existing lead handling in frontend
The current lead form still posts to a Google Apps Script endpoint and stores a browser-local backup. The UI can show success without a confirmed backend response because the request uses `no-cors`.

## Supabase
A `leads` table now exists with fields for contact info, source/medium/campaign/content, landing page, referrer, session ID, first/last touch, audited business/score, follow-up state, consent flags, test markers, and raw payload.

An insert policy exists for anonymous/authenticated lead creation with basic validation. The frontend has not yet been wired to make Supabase the confirmed source of truth.

## Highest-priority work
1. Replace false-success lead submission with confirmed Supabase persistence.
2. Preserve Google Apps Script only as a temporary secondary path if needed, not the source of truth.
3. Capture UTM/referrer/session attribution at arrival and persist it with the lead.
4. Run an end-to-end marked test lead and verify the exact row.
5. Connect follow-up trigger/logging.
6. Only then spend money driving traffic.

## Test convention
Use `is_test=true` and an explicit `test_code` such as `RB-END2END-001` so tests never contaminate production KPIs.
