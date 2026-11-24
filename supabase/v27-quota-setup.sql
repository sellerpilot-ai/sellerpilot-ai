-- Deployment candidate, not applied. Review and test in Supabase before enabling paid generation.
begin;
create schema if not exists sellerpilot_ai_private;
revoke all on schema sellerpilot_ai_private from public, anon, authenticated;
grant usage on schema sellerpilot_ai_private to service_role;
create table if not exists sellerpilot_ai_private.usage_by_day (
  day date not null,
  user_id uuid not null,
  calls integer not null check(calls>=0),
  primary key(day,user_id)
);
alter table sellerpilot_ai_private.usage_by_day enable row level security;
revoke all on sellerpilot_ai_private.usage_by_day from public, anon, authenticated;
grant select,insert,update on sellerpilot_ai_private.usage_by_day to service_role;
create or replace function public.sellerpilot_reserve_ai_request(p_user_id uuid,p_daily_cap integer,p_monthly_cap integer,p_user_cap integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
  d date := (now() at time zone 'UTC')::date;
  month_start date := date_trunc('month', (now() at time zone 'UTC'))::date;
  day_total bigint;
  month_total bigint;
  user_total integer;
begin
  if p_user_id is null or p_daily_cap is null or p_monthly_cap is null or p_user_cap is null
    or p_daily_cap not between 1 and 100 or p_monthly_cap not between 1 and 1000 or p_user_cap not between 1 and 10 then return false; end if;
  -- Serialize reservations across all callers so simultaneous requests cannot exceed the global cap.
  perform pg_catalog.pg_advisory_xact_lock(270027);
  select coalesce(sum(calls),0) into day_total from sellerpilot_ai_private.usage_by_day where day=d;
  select coalesce(sum(calls),0) into month_total from sellerpilot_ai_private.usage_by_day where day>=month_start and day<=d;
  select coalesce((select calls from sellerpilot_ai_private.usage_by_day where day=d and user_id=p_user_id),0) into user_total;
  if day_total>=p_daily_cap or month_total>=p_monthly_cap or user_total>=p_user_cap then return false;end if;
  insert into sellerpilot_ai_private.usage_by_day(day,user_id,calls) values(d,p_user_id,1)
    on conflict(day,user_id) do update set calls=sellerpilot_ai_private.usage_by_day.calls+1;
  return true;
end;
$$;
revoke all on function public.sellerpilot_reserve_ai_request(uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.sellerpilot_reserve_ai_request(uuid,integer,integer,integer) to service_role;
commit;
