# V196 — Etsy preview staged installation review

Status: review only, do not execute against live Supabase without explicit owner approval. Tested SQL source: launch/v192-etsy-authorization-draft.sql, blob 1e28408cd069278b5993363470276197f07a77b3, candidate 0e70cccd06c44024645a1d9a1afd551aa39b4fe3.

## Verified evidence
- Disposable PostgreSQL run 45634308310/job 139275540351: sequential permission, expiry, ownership, replay, replacement, daily quota, cleanup and account deletion tests passed; eight parallel starts produced exactly five successes; eight parallel consumes returned one verifier exactly once.
- Offline 45634308299 and browser 45634308339 passed on the same candidate.
- Live read-only metadata at V191 found no Etsy preview RPCs, tables or deployed preview function. Recheck immediately before approved installation; never overwrite unknown objects.

## Required before installation
- Confirm Etsy app status and permitted scope in Etsy developer dashboard, exact canonical callback https://sellerpilot-ai-21c.pages.dev/etsy-return.html. Do not paste secrets or account identifiers into GitHub or chat.
- Confirm the service role has BYPASSRLS and the dedicated schema is not exposed. Verify public RPC schema is exposed but EXECUTE is restricted to service_role. Check existing object names and dependencies.
- Agree to five starts per UTC day and ten-minute state expiry; one pending state per user. Approve the specific migration only, not deployment or activation.
- Review cleanup scheduling and origin/configuration change procedure. The current SQL does not bind the stored state to a redirect URI; keep activation disabled until this is addressed or a tested drain-and-invalidate procedure is agreed. Do not switch callback configuration with pending states.

## Controlled stages
1. Apply reviewed SQL once with migration history, after explicit owner approval. Recheck schema, RLS, role permissions, RPC signatures, security advisors and unchanged existing catalogue counts; do not call production begin/consume in this stage.
2. Establish a separately approved cleanup schedule before activation; verify no expired verifier is retained beyond the agreed cleanup interval. No provider calls.
3. Only with separate deployment approval, deploy the reviewed preview Edge Function with JWT verification enabled, preview flag disabled and no live Etsy call. Test credential-free CORS and disabled status with an authorized account.
4. Only after Etsy permission and separate activation approval, configure the exact registered callback and authorized operator. One owner-consented, read-only preview; no import, retained Etsy tokens, automated analytics or AI. Explicitly stop if provider approval or endpoint contract is unverified.

## Rollback proposal (not approved, not executed)
Disable preview first, stop cleanup schedule and confirm no pending calls. If the isolated new objects were installed and there are no unexpected dependents, review the following rollback in a disposable database before any live rollback approval:
```sql
begin;
drop function public.sellerpilot_etsy_cleanup();
drop function public.sellerpilot_etsy_consume(uuid,text);
drop function public.sellerpilot_etsy_begin(uuid,text,text);
drop table sellerpilot_etsy_private.authorization;
drop schema sellerpilot_etsy_private;
commit;
```
No CASCADE. This removes only new preview-specific pending state and quota records; cannot be used to delete catalogue, existing workspace or unrelated functions. Never run if objects were not created by this migration. Keep the existing nine live functions and protected candidate PR #48 unchanged.

No live changes, secrets, provider calls, payments or additional spending.

## V200 candidate update — 25 November 2026

Owner dashboard confirms Pending Commercial Approval; no duplicate application or live Etsy activation. Written permission for intended analytics/AI uses remains unresolved.

V197 binds opaque state digest to exact canonical redirect using a domain-separated SHA-256 hash of a JSON array. SQL/RPC signatures unchanged. Callback-switch test rejects token exchange without consuming original pending state. Offline and browser tests passed at 0e23185dc28e111d36c02920cbb58b937850c099. V198/V199 cleanup and rollback fixture encountered malformed dollar quoting; corrected at 646fdb68695ff08ff428c1b3e0686c454951c908. Final PostgreSQL verification still pending. Earlier V194 success does not establish new tests passed.

Proposed cleanup: server-only invocation every five minutes, conditional on verified scheduler availability, permissions and cost. Ten-minute expiry always enforced; nominal removal within fifteen minutes if scheduling succeeds. Verify expired row counts and scheduler failures before activation; no provider HTTP calls or automatic extension installation. Keep preview disabled until approval, cleanup and all CI are verified. If digest format changes after deployment, disable preview and invalidate outstanding states before switching. Separate approvals required for migration, scheduling, deployment and activation. No live changes.

## 25 November — production approval and canonical domain candidate
Owner supplied an Etsy email reporting approval of full production access. Confirm correct app and access type in developer dashboard, exact redirect registration, scopes, rate limits and approved use description before installation. General approval does not by itself establish express permission for analytics or AI; Etsy API Terms sections 24–25 require written authorization for specified automated/analytics uses. See https://www.etsy.com/uk/legal/api/ and https://developers.etsy.com/documentation/essentials/authentication/. Request clarification where needed. No Etsy data has been fetched. Candidate adds exact https://yuvilist.com/etsy-return.html callback on frontend and backend, still requiring one exact server-configured URI; preserve legacy paths. Owner must register exact URI, not a wildcard. No migration, function deployment or activation approved by this commit. First owner-only preview must remain title/ID/state only, no persisted tokens, imports, analytics, AI or payments.

## Live installation record — 25 November 2026
Commercial access confirmed in owner dashboard; owner confirmed exact https://yuvilist.com/etsy-return.html persisted after reopening. All four workflows passed at 81ffafcea2e3a453ba0a721e237bc09403d295b0. Owner approved V192 migration, applied as 20261125211641. Verified RLS enabled, no anon/authenticated schema, table or RPC access, service role can execute all three invoker RPCs with fixed search path, cascade FK exists, initial table empty. Two existing accounts, five products and one workspace preserved.
Owner approved cleanup schedule; pg_cron 1.6.4 installed on existing free project. One active job yuvilist-etsy-authorization-cleanup, every five minutes, running only SET LOCAL ROLE service_role; SELECT public.sellerpilot_etsy_cleanup();. Manual transaction under service role succeeded against empty authorization table. Scheduled run history must show success before activation. Monitor own job history storage; Supabase Cron does not purge history automatically. Do not modify unrelated jobs. Rollback requires disabling/unscheduling this named job before dropping RPCs; do not drop pg_cron indiscriminately. No network calls or new paid service. Official docs https://supabase.com/docs/guides/cron/quickstart.
Edge candidate is ready for separate approval to deploy, JWT required, preview disabled. Reviewed Etsy OAuth documentation confirms token scope field, numeric user prefix, PKCE and exact redirect; API request headers and owner shop endpoint match candidate. Still need verify real response under one owner-consented preview. No live function deployed or Etsy API call made. Configure credentials only in server secrets; do not disclose values. Keep existing frontend until candidate deploy explicitly approved. No analytics or AI on Etsy API data without appropriate permission.

## Live owner-assisted acceptance — 25 November 2026
Owner confirmed all six secret names/settings and approved private activation. Disabled function verified via authenticated UI; activation-ready function version 4 matched reviewed GitHub source with JWT verification enabled. Owner uploaded candidate from workflow 45703121021 (54 files), confirmed deployment and live disabled/available status. Owner consented to two Etsy previews: one verified empty shop (0/0 at 21:40:43 UTC) and one populated shop (24/24 at 21:43:51 UTC). Screenshots establish live OAuth, shop verification and listing retrieval; no shop identifiers, listings, email addresses or credentials recorded in GitHub. Subsequent read-only SQL found two accounts, five existing products, one existing workspace, one quota row with two attempts, zero pending authorization state/verifier values; five successful cleanup runs, zero failed. Reviewed handler does not persist Etsy tokens or listings. No claim of comprehensive logs/provider retention review or byte-for-byte verification. Owner-only preview stays enabled until operator disables; recommend disable after testing and revoke Etsy grants if no longer needed. No additional spending or AI/analytics. Before further API use, obtain written clarification of analytics/AI, storage, pricing and commercial scope. New candidate only adds manual selection to ephemeral display of already-authorized minimal preview fields; no transfer to audit/AI, additional fields, persistence or API requests. CI pending; no new deployment authorized.
