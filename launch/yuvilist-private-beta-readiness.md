# YuviList launch review — working draft, not a legal approval

Scope: manual/CSV seller workflow, listing audits, local keyword ideas, tasks, profit tools, and separately authorised AI. Live marketplace integrations are outside this release. No new public signups, live payments, new provider spend or live account deletion is authorised by this document.

## Owner decisions before inviting external testers

- Confirm legal controller and trading operator (individual/sole trader/company), legally required trading/contact address, country, ability to operate the business, tax obligations, and whether ICO registration/fee is applicable. Do not commit personal residential information in this public repository.
- Verify provider contracts, processor terms, hosting regions, international transfer mechanisms and subprocessor/retention settings. Supabase (auth and workspace), Cloudflare (hosting/access and mail forwarding), Resend (transactional email), Gmail (support mailbox), OpenAI (restricted AI), Stripe (sandbox billing; production only after approval), and any enabled research provider. Keep disabled services disabled. Do not present provider region alone as proof of data residency.
- Confirm support responsibility and an outbound reply method that does not unexpectedly expose a personal mailbox. Incoming support delivery is tested. Transactional sender is noreply@mail.yuvilist.com; support@yuvilist.com is separate. Do not use noreply for customer support replies.
- Approve a retention schedule after provider verification. Proposed operational targets, not promises: keep active workspace data for service delivery; review inactive beta accounts after 90 days; remove eligible closed-account active data within applicable rights deadlines; keep support tickets only as necessary (proposed 12 months subject to review); confirm backup expiry and distinguish required financial/security/legal records from deletable account content. No blanket promise to erase third-party backups immediately.

## Privacy notice completion draft

Identify controller and contact details; describe categories (account/contact/authentication, catalogue and workspace records, account-scoped browser preferences, support communications, limited security/usage logs, and opted-in AI inputs). Specify purposes and assessed lawful bases for account provision, security, support and optional features. Explicit confirmation in UI is a product safeguard, not automatically GDPR consent. List actual recipients and transfer safeguards. Explain retention, rights and complaint route, and whether information is necessary to supply the service. Existing preview notice remains explicitly provisional. Do not publish final claims until owner approves facts and lawful bases.

## Rights and account closure procedure

1. Receive request at support@yuvilist.com. Record receipt, type, deadline and minimal correspondence in a restricted operator record, not public issues. Acknowledge promptly; ordinarily respond within one month, subject to applicable rules. No passwords, JWTs or API keys by email.
2. Proportionately verify identity using an established account/contact route, not unnecessary ID collection. Establish scope, any applicable exception and affected processors. Provide eligible data in a secure manner for access/export; review separately any portability, correction, objection or restriction request.
3. For eligible closure, confirm whether account access and any billing must be stopped; revoke relevant sessions and access before deletion, remembering existing access tokens can remain valid until expiry. Confirm backup/restore handling, third-party obligations and legal retention requirements.
4. On a separately approved disposable test account only, verify owner identity internally, capture counts without personal data, remove non-cascading per-user AI usage as appropriate and delete the test auth user using authorised admin tooling. Verify cascading account-linked rows and no orphaned data; check unrelated account unchanged. Include storage, logs, support inbox, provider records and browser data in the review. Do not delete either existing account as a rehearsal.
5. Confirm outcome, records retained and reason where applicable; explain complaint route. Document limitations and exceptions. No destructive rehearsal has been executed yet.

## Payment readiness (sandbox only)

Existing proposed sandbox plans are Starter GBP 9.99/month and Professional GBP 19.99/month. Preserve current test product IDs/names while backend exact-name validation depends on them. Do not rename those Stripe products in isolation. Public pricing remains unconfirmed; no sales promise or final margin assumptions. Owner must approve actual pricing, credit allowances, renewal frequency, taxes, cancellation/refund terms, legal identity, supported territories, dispute/support process, merchant onboarding and settlement account. For applicable consumer contracts, verify pre-contract information, cancellation rights and subscription rules in force. Implement and test cancellation, failed/renewed payments, webhook retries, idempotency, entitlement revocation and refunds before accepting real money. Existing sandbox functions are not a production billing system; live keys, live checkout and production entitlements require separate design, review and explicit approval. No live Stripe branding or provider settings changed.

## Release checks

- Verify exact CI head, package manifest, 54 static files, rollback deployment ID. Protect root and app routes on new host; test allowed and disallowed access, actual signed-in account switch, catalogue, audit/save/refresh/export, empty-account flow and recovery on new origin. Test AI status/allowance without requesting billable generation; actual paid provider tests only with approval.
- Confirm sign-out on mobile, no unexpected provider calls, support incoming and outgoing, deletion rehearsal, legal owner approval and public registration policy. Invite a small consented private group only after policies and access procedure are ready.
- Keep old origin and internal data formats as compatibility paths; no repository merge or upload until explicitly approved. Current live deployment is not the latest development candidate.

Official guidance to review: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/ ; https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/ ; https://www.gov.uk/online-and-distance-selling-for-businesses ; https://www.gov.uk/search-for-trademark .
