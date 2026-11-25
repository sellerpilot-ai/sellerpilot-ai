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
