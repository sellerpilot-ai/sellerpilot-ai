# V32 beta and commercial release gates — not a public commercial launch

## Combined acceptance check
Test with dedicated, non-production data and two test accounts:
- Sign-up/verification, sign-in/recovery, sign-out, RLS/account isolation and data export.
- GBP CSV import including duplicate/malformed/non-GBP rows, edit/save/delete and reload.
- Guided fixes, undo, score consistency, explicit save; no live marketplace writes.
- Keyword, research and contribution calculator; confirm no invented marketplace metrics.
- Weekly snapshot save/update/reload/export; no scheduled email delivery.
- Mobile/desktop layout and feedback file download (no auto submission).
- AI disabled state, then separate approved paid end-to-end text/image requests; validate spending and privacy controls.
- Etsy disabled state, then approved test-account authorisation with state rejection/replay tests and actual data preview.
- Account deletion and all retention/rights workflows before commercial onboarding.

## Billing design, pending operator and provider approval
No provider selected, no credentials, no checkout and no subscription entitlements claimed. Keep beta access free for existing testers.
1. Approve operator, pricing, currency, VAT and legal terms; select a payment provider and register account.
2. Use hosted checkout (never collect card details in SellerPilot). Create sessions only on verified backend, map approved price IDs server-side, use authenticated customer mapping and idempotency. No client-controlled prices.
3. Grant access only after verified signed webhook/provider state. Store private subscription state server-side; enforce quotas there, not through UI flags. Handle event replay, out-of-order updates, cancellations, failed payments, refunds and grace periods.
4. Test mode: checkout, renewal, failure, cancellation, account isolation and replay; then obtain explicit approval before live transactions.
5. Publish verified support contact, approved privacy/terms and billing information; complete security review and real acceptance checks. Do not launch broadly until all gates are closed.

## Decisions still required
AI budget/model/credentials and backend deployment; Etsy approved app access; operator details and support; billing provider and pricing; full privacy notice, terms, account deletion/retention; combined manual acceptance and launch approval. USD/multi-currency catalogue support is still pending.
