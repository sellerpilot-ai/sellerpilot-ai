# V191 Etsy preview backend readiness — hold activation
Verified 25 November 2026; candidate 842bb6662591da4ade1f75e952bdafae890484e6, draft PR #50. Previous protected release PR #48 unchanged.

## Evidence
- Offline run 45632386821 and browser run 45632386694 completed successfully. Tests use mock providers, not real Etsy authorisation.
- Read-only live PostgreSQL catalogue inspection returned zero functions matching sellerpilot_etsy_% and zero tables matching %etsy% in application schemas. No rows, tokens or credentials read.
- Live Edge Function inventory contains nine active functions; sellerpilot-etsy-preview is absent. Therefore the preview cannot run live yet.
- Existing handler expects service-only RPC sellerpilot_etsy_begin(p_user_id, p_state_hash, p_verifier) returning boolean and sellerpilot_etsy_consume(p_user_id, p_state_hash) returning verifier or null. The tested handler uses 64 lowercase hex characters for state and verifier; state is SHA-256 hashed before persistence. The distinct V73 offline prototype is not the deployed database contract.

## Activation gates (all required)
1. Verify Etsy developer app status and access type; confirm scope and exact registered callback https://sellerpilot-ai-21c.pages.dev/etsy-return.html. Never share secret, code, token, password or OTP in chat. No API data analytics or AI without appropriate written authorisation.
2. Prepare a separately reviewed SQL migration (not applied): durable single-use state with 10-minute expiry, per-user quota and atomic consume, fixed search path, no direct client table privileges, RLS and service-only RPC execute grants. Consider per-origin redirect binding and credential rotation before activation. Test concurrency, replay, expiry, wrong user, invalid inputs, quota and rollback against isolated PostgreSQL.
3. Obtain explicit owner approval before any live migration. Verify metadata, privileges, policies, migration history and advisors after application. Do not invoke live begin/consume until separately approved.
4. Deploy reviewed preview function with JWT verification only after owner approval. Keep preview flag disabled; configure exact callback and separate marketplace allowlist. No API credentials in frontend.
5. Verify disabled status and allowed/denied origin handling. Only after permission and explicit activation approval perform one consented read-only owner shop preview; never retain Etsy access/refresh tokens in this preview, no automatic import, no external analytics or AI.
6. Record actual evidence and disable immediately if any check fails. Rollback: disable preview first, revoke access, remove only preview-specific infrastructure after separately approved migration; preserve existing catalogue and functions.

No live changes, Etsy requests, paid calls or deployment during this review.
