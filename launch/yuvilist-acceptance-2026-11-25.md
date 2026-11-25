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
- Real payment activation and paid provider calls were not requested.

## Recovery and deletion
Organization plan confirmed Free using read-only connector. Supabase documentation states automatic daily backups are paid-plan features; manual logical exports are recommended for Free. See https://supabase.com/docs/guides/platform/backups and https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.
A synthetic local dump/restore check is added to the disposable lifecycle workflow; it does not back up the hosted database, copy real accounts, or establish production recovery guarantees. A secure operator-held logical backup and isolated recovery exercise remain necessary. Never store live dump files, account data or credentials in GitHub.
The existing six-cascade lifecycle model passed. No actual hosted account deletion or live restore has been attempted. Require an explicitly approved disposable account, documented session revocation/expiry and scoped deletion review. Never delete existing accounts.

## Outstanding before external invitation
- Live workspace JSON export and separate-account isolation acceptance.
- Read-only AI/research and sandbox status checks; no generation or paid lookup.
- Secure manual database backup and restore plan (no paid upgrade without approval).
- Disposable account closure rehearsal and policy/processor review; confirm legal operator, terms, privacy and retention.
- Confirm current release ID and retain private release ZIP.
- Keep registration closed and billing test-only. External invitations and commercial launch are separate approvals.
