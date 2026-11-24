# V55 — Paid AI enforcement preparation (not implemented or activated)

V52–V55 only verify sandbox subscriptions and simulated allowances. The existing private AI beta has separate access checks and usage counters. Never use a sandbox dashboard response, browser state, or test credit ledger to grant production AI access.

## Release requirements for a future server-side gate

- Verify the caller's identity and account ownership on the server; never trust a client-supplied plan, credit cost, usage value, or subscription ID.
- Require a separately configured production enable flag, authoritative live subscription state, matching live price and account mapping, paid invoice, and a current eligible period. Fail closed on missing, stale, conflicting or ambiguous data.
- Keep sandbox and live keys, events, subscriptions and credit ledgers separate. Existing beta access must not silently become a production entitlement.
- Compute costs server-side: text 1, photo 3 and Professional-only, subject to final commercial approval. Reserve atomically against daily and monthly limits with unique request IDs and concurrency locking. Decide retry, timeout and refund semantics before provider calls are enabled.
- Enforce the gate inside each server-side AI action before calling an AI provider; UI messages are informational only. Free local brief creation must remain unaffected.
- Test expiry, scheduled cancellation, failed invoice, account mismatch, duplicate requests, parallel reservations, downgrade and calendar boundaries, and provider failure. Use fixtures and isolated test data before any production rollout.
- Require explicit approval of pricing, commercial terms, tax handling, live Stripe setup and paid AI activation. No real charges or new permissions in V55.
