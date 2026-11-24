# V38 — billing foundation (not a live payment integration)
Date: 24 November 2026. Private beta remains free. No provider account, price IDs, secrets, checkout endpoint, webhook handler, subscription table or production entitlement enabled.

## Candidate provider comparison
- Stripe Payments + Billing: UK standard-card processing 1.5% + GBP 0.20 plus 0.7% Billing volume; international, FX, tax and other fees may differ. Operator remains responsible for applicable tax and compliance.
- Paddle: Merchant of Record, advertised 5% + USD 0.50, subject to eligibility and terms. Handles transaction tax and billing compliance within its scope.
- Stripe Managed Payments: Merchant of Record candidate, advertised 3.5% plus processing; confirm eligibility, recurring billing/FX and all-in fees.
- Lemon Squeezy: migration announcement says transactions stop 31 March 2027; do not build a new integration around it.
Sources: https://stripe.com/gb/pricing ; https://stripe.com/gb/billing/pricing ; https://www.paddle.com/pricing ; https://support.stripe.com/questions/managed-payments-pricing ; https://docs.lemonsqueezy.com/migration

## Draft plan design (internal assumptions, not approved public offers)
Free sample shop; Starter and Professional monthly plans in GBP/USD. Proposed internal price hypotheses GBP 9.99 and 19.99, subject to market research, unit cost measurement, VAT treatment, user approval and provider setup. No unlimited AI. Do not advertise marketplace data, photo analysis or scheduled reports before working approvals and acceptance tests. No annual commitment initially.

## Implemented
Isolated server-only Stripe-shaped test checkout policy with verified user, allowlisted plans/currencies, trusted server price IDs, test-key and test-mode requirement, fixed return URLs, account-matched customer IDs. Sandbox entitlement policy denies unverified, foreign, expired, unsupported or live records. No network calls; no grants in production. The function consumes an already verified identity and provider record; it does not verify either itself. Public pages still prohibit purchase.

## Next release gates
1. Confirm lawful business operator, business contact/address, right to undertake business, tax obligations, pricing and provider eligibility. Approve provider explicitly.
2. Configure dedicated sandbox account, prices and webhook signing secret privately. Build authenticated checkout and verified webhook endpoints; no client-set prices, user IDs or entitlement.
3. Verify raw-body signatures with replay protection, reconcile authoritative provider state, transactional event deduplication and ordering, private customer mapping with unique ownership. Test refunds, disputes, cancellation, renewal, failed payments, deletion and cross-account isolation.
4. Implement atomic per-plan quotas and enforce them server-side; retain global spend protections. Complete formal privacy/terms, support and deletion process.
5. Real test-mode checkout plus provider sandbox events, then explicit live activation approval. No payment collection before release gates pass.
