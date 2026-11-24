# V39 — private beta release preparation (24 November 2026)

Not commercial launch approval. Current public pages are previews and the signed-in workspace is for established testers.

## Evidence and status
- V23: actual mobile guided fix/save confirmed; V24–V38 regression suite uses isolated mock networks and data, not proof of every live integration.
- V34: live text generation succeeded after credential replacement, recorded HTTP 200 and 3 reserved calls on 24 November (two earlier failures). Provider cost not independently verified. Photo AI still needs live activation and test after quota reset.
- V35: weekly snapshot on successful sync, opt-in; no closed-browser scheduler or email.
- V36: Etsy personal app application pending. Previous Averuna restriction and separate commercial/analytics/AI permission must be clarified directly with Etsy. No new key activation or API use pending clearance.
- V37: workspace export and local request-file workflow; not full personal-data response or self-service deletion.
- V38: isolated mock test checkout policy only; no payment provider, checkout/webhooks, subscription enforcement or payment collection.
- Security review on 24 November: four application tables RLS enabled, no anonymous SELECT. Two service-only usage tables have no user policies by design. Supabase advisor warns leaked-password protection disabled. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- V39: pause public registration in website UI, clear sensitive brief and research UI fields on workspace reset, correct outdated AI status and add data-source warnings. Frontend signup pause is not a server access control: disable new user signup in Supabase Auth settings, verify a direct signup attempt is rejected and preserve existing testers. Consent wording is not technical proof of data provenance.

## One combined acceptance session (use independently supplied test data)
1. Existing account sign-in, sign-out, reload, recovery; separate authorised disposable account for isolation. Verify signup pause at backend and server-side ownership for all reads/writes. Confirm no sensitive UI state remains across account changes.
2. Demo without login; catalogue create/edit/save/undo/reload, GBP/USD import validation and exports.
3. Audit, keyword and profit checks; weekly opt-in snapshots and pause; export and review data scope.
4. Live text and photo AI after daily allowance reset; measure real API cost, evaluate output quality, invalid input, usage cap, no auto-apply, no unsupported facts.
5. Etsy unavailable state only until approvals; after written clearance test read-only access, permissions and disconnect.
6. Full deletion/retention and verified contact workflow; leaked-password protection or documented alternative; independent security review.
7. Choose billing provider and verify legal operator, right to operate business, VAT/tax, prices and terms; build/test real sandbox checkout, signed webhooks, entitlement/quota enforcement, cancellations/refunds and failure handling.
8. Confirm approved legal notice and support, launch consent, monitoring/incident response and rollback. Only then enable public onboarding or payments.

No new paid services, no database mutations, no API calls made for V39 development. Existing private account access and independent local tools preserved.