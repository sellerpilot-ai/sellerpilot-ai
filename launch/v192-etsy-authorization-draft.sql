-- V192 REVIEW ONLY. Do not apply to live infrastructure without owner approval.
-- Dedicated non-exposed schema. Service role only; no browser grants.
begin;
create schema sellerpilot_etsy_private;
revoke all on schema sellerpilot_etsy_private from public, anon, authenticated, service_role;
grant usage on schema sellerpilot_etsy_private to service_role;

create table sellerpilot_etsy_private.authorization (
 user_id uuid primary key references auth.users(id) on delete cascade,
 quota_day date not null,
 attempts integer not null check (attempts between 1 and 5),
 state_hash text unique check (state_hash ~ '^[a-f0-9]{64}$'),
 verifier text check (verifier ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz,
 check ((state_hash is null and verifier is null and expires_at is null)
     or (state_hash is not null and verifier is not null and expires_at is not null))
);
alter table sellerpilot_etsy_private.authorization enable row level security;
revoke all on table sellerpilot_etsy_private.authorization from public, anon, authenticated, service_role;
grant select, insert, update, delete on table sellerpilot_etsy_private.authorization to service_role;

-- One outstanding request per account; five authorisations per UTC calendar day.
create function public.sellerpilot_etsy_begin(p_user_id uuid, p_state_hash text, p_verifier text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
 t timestamptz := clock_timestamp();
 d date := (t at time zone 'UTC')::date;
 accepted boolean;
begin
 if p_user_id is null or p_state_hash is null or p_verifier is null
    or p_state_hash !~ '^[a-f0-9]{64}$' or p_verifier !~ '^[a-f0-9]{64}$' then
  return false;
 end if;
 insert into sellerpilot_etsy_private.authorization as a(user_id,quota_day,attempts,state_hash,verifier,expires_at)
 values(p_user_id,d,1,p_state_hash,p_verifier,t+interval '10 minutes')
 on conflict(user_id) do update set
  quota_day=excluded.quota_day,
  attempts=case when a.quota_day=excluded.quota_day then a.attempts+1 else 1 end,
  state_hash=excluded.state_hash,verifier=excluded.verifier,expires_at=excluded.expires_at
 where a.quota_day<excluded.quota_day or (a.quota_day=excluded.quota_day and a.attempts<5)
 returning true into accepted;
 return coalesce(accepted,false);
exception when unique_violation or foreign_key_violation then return false;
end;
$$;

-- Lock only the caller-bound state; clear it in the same transaction before returning.
create function public.sellerpilot_etsy_consume(p_user_id uuid,p_state_hash text)
returns text language plpgsql security invoker set search_path = '' as $$
declare saved_verifier text; deadline timestamptz;
begin
 if p_user_id is null or p_state_hash is null or p_state_hash !~ '^[a-f0-9]{64}$' then return null; end if;
 select a.verifier,a.expires_at into saved_verifier,deadline
 from sellerpilot_etsy_private.authorization a
 where a.user_id=p_user_id and a.state_hash=p_state_hash
 for update;
 if not found then return null; end if;
 update sellerpilot_etsy_private.authorization
 set state_hash=null,verifier=null,expires_at=null
 where user_id=p_user_id;
 if deadline<=clock_timestamp() then return null; end if;
 return saved_verifier;
end;
$$;

-- Must be run by a reviewed server-side scheduled cleanup before live activation.
-- Never deletes quota rows for the current UTC day.
create function public.sellerpilot_etsy_cleanup()
returns void language plpgsql security invoker set search_path = '' as $$
begin
 update sellerpilot_etsy_private.authorization
 set state_hash=null,verifier=null,expires_at=null
 where expires_at<=clock_timestamp();
 delete from sellerpilot_etsy_private.authorization
 where quota_day < (clock_timestamp() at time zone 'UTC')::date - 1
 and state_hash is null;
end;
$$;
revoke all on function public.sellerpilot_etsy_begin(uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function public.sellerpilot_etsy_consume(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.sellerpilot_etsy_cleanup() from public,anon,authenticated,service_role;
grant execute on function public.sellerpilot_etsy_begin(uuid,text,text) to service_role;
grant execute on function public.sellerpilot_etsy_consume(uuid,text) to service_role;
grant execute on function public.sellerpilot_etsy_cleanup() to service_role;
commit;
