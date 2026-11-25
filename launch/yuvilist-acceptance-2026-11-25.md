# YuviList private beta acceptance — 25 November 2026

## Release evidence
Candidate f35097c97e39d4bb1e26951649e704aaaae283c2; four GitHub workflows passed. Browser workflow 45688277690 produced the 54-file archive and passed independent archive verification. Owner uploaded the candidate to the existing protected Cloudflare Pages project. Prior deployment prefix 03b8afc9 retained for rollback; new deployment identifier not independently recorded. This record does not authorise another deployment.

## Owner-assisted live checks
- Mobile homepage and authenticated workspace: pass, based on owner screenshots.
- Four existing catalogue listings and research sync: pass. Live aggregate SQL read-only check also found two accounts, five products total, one research workspace and zero orphan product/workspace rows.
- Guided listing edit and recheck: score 72 to 88; refresh without saving restored 72. No live product write requested.
- Fresh incognito root, app and subscription dashboard: Cloudflare Access login displayed. This is evidence of an access gate, not a full penetration or account allowlist test.
- Mobile sign-out and recovery: recovery message received from branded transactional sender; owner reported successful password change and login. Old password rejection not separately verified.
- Support: dedicated Resend inbox sent branded email to external mailbox and received its reply through Cloudflare forwarding in same thread. Existing verified Gmail destination retained as manual fallback, not automatic dual delivery. No incoming MX migration.
- Etsy approval email observed. Approved scope, app identity, limits and live OAuth still need independent verification. No integration activation in this acceptance batch.
- Owner confirmed live workspace JSON download; contents not inspected to avoid exposing private data.
- Live AI status displayed three of three personal requests available; no generation requested. Google demand status displayed enabled for private account; no external search requested.
- Live subscription dashboard displayed verified Starter test subscription, five of five daily simulated credits, scheduled cancellation, production access OFF. No checkout or real payment requested.

## Recovery and deletion
Organization plan confirmed Free using read-only connector. Supabase documentation states automatic daily backups are paid-plan features; manual logical exports are recommended for Free. See https://supabase.com/docs/guides/platform/backups and https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.
Synthetic local dump/restore check passed in workflow 45699305113 (checksum, recovery, ownership, RLS metadata and cascade). All four workflows passed at b104cbeaece47ce08ed949ebea56095ec92e5f88. The check does not back up the hosted database, copy real accounts, or establish production recovery guarantees. A secure operator-held logical backup and isolated recovery exercise remain necessary. Never store live dump files, account data or credentials in GitHub.
The existing six-cascade lifecycle model passed. Live disposable account creation, isolation, fictional product creation, export, sign-out and owner-approved deletion completed. Read-only SQL verified zero test sessions before deletion; after deletion zero test account/product/usage records, both original accounts, five original products, one original workspace and zero orphaned records. This tests active database deletion only, not historical logs, provider copies or stale JWT expiry. Live restore remains untested. Never delete existing accounts.

## Outstanding before external invitation
- Optional local inspection of downloaded export by owner; separate-account live isolation passed.
- Secure manual database backup and restore plan (no paid upgrade without approval).
- Policy/processor review; confirm legal operator, terms, privacy and retention. Disposable active database closure rehearsal passed.
- Confirm current release ID and retain private release ZIP.
- Keep registration closed and billing test-only. External invitations and commercial launch are separate approvals.

## Later Etsy acceptance — 25 November 2026
Commercial access dashboard and canonical callback registration confirmed. Owner approved isolated authorization migration, cleanup schedule, disabled deployment and private activation. Live UI showed disabled and then available status; two real shop previews succeeded (empty 0/0 and populated 24/24). Database readback retained two accounts, five products, one workspace; no pending authorization state after two attempts. Five successful cleanup runs, zero failures. Details and caveats in v196-etsy-installation-review.md. No listing import, analytics, AI, real payments or public invitation. Additional Etsy usage and monetization permissions remain unresolved.
