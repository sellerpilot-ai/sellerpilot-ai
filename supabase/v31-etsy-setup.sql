-- Candidate only. Do not apply until Etsy access and activation approved.
begin;
create schema if not exists sellerpilot_etsy_private;
revoke all on schema sellerpilot_etsy_private from public, anon, authenticated;
grant usage on schema sellerpilot_etsy_private to service_role;
create table if not exists sellerpilot_etsy_private.pending (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state_hash text not null check(length(state_hash)=64),
 verifier text not null check(length(verifier)=64),
 expires_at timestamptz not null
);
create table if not exists sellerpilot_etsy_private.daily (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 attempts integer not null check(attempts between 0 and 5),
 primary key(user_id,day)
);
alter table sellerpilot_etsy_private.pending enable row level security;
alter table sellerpilot_etsy_private.daily enable row level security;
revoke all on all tables in schema sellerpilot_etsy_private from public,anon,authenticated;
grant select,insert,update,delete on all tables in schema sellerpilot_etsy_private to service_role;
create or replace function public.sellerpilot_etsy_begin(p_user_id uuid,p_state_hash text,p_verifier text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d date:=(now() at time zone 'UTC')::date; n integer;
begin
 if p_user_id is null or p_state_hash is null or p_verifier is null or p_state_hash !~ '^[a-f0-9]{64}$' or p_verifier !~ '^[a-f0-9]{64}$' then return false;end if;
 perform pg_catalog.pg_advisory_xact_lock(310031);
 delete from sellerpilot_etsy_private.pending where expires_at<=now();
 delete from sellerpilot_etsy_private.daily where day<d-7;
 select coalesce(sum(attempts),0) into n from sellerpilot_etsy_private.daily where day=d;
 if n>=100 then return false;end if;
 select coalesce((select attempts from sellerpilot_etsy_private.daily where day=d and user_id=p_user_id),0) into n;
 if n>=5 then return false;end if;
 insert into sellerpilot_etsy_private.daily values(p_user_id,d,1) on conflict(user_id,day) do update set attempts=sellerpilot_etsy_private.daily.attempts+1;
 insert into sellerpilot_etsy_private.pending values(p_user_id,p_state_hash,p_verifier,now()+interval '10 minutes') on conflict(user_id) do update set state_hash=excluded.state_hash,verifier=excluded.verifier,expires_at=excluded.expires_at;
 return true;
end;$$;
create or replace function public.sellerpilot_etsy_consume(p_user_id uuid,p_state_hash text)
returns text language plpgsql security invoker set search_path='' as $$
declare v text;
begin
 delete from sellerpilot_etsy_private.pending where user_id=p_user_id and state_hash=p_state_hash and expires_at>now() returning verifier into v;
 return v;
end;$$;
revoke all on function public.sellerpilot_etsy_begin(uuid,text,text) from public,anon,authenticated;
revoke all on function public.sellerpilot_etsy_consume(uuid,text) from public,anon,authenticated;
grant execute on function public.sellerpilot_etsy_begin(uuid,text,text) to service_role;
grant execute on function public.sellerpilot_etsy_consume(uuid,text) to service_role;
commit;
