-- Candidate SQL only; depends on V42 ledger. Never used by production AI.
begin;
create table public.sellerpilot_sandbox_credit_requests (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 subscription_id text not null check(subscription_id ~ '^sub_[A-Za-z0-9]+$'),
 plan text not null check(plan in ('starter','professional')),
 feature text not null check(feature in ('text','photo')),
 credits integer not null check((feature='text' and credits=1) or (feature='photo' and plan='professional' and credits=3)),
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.sellerpilot_sandbox_credit_requests enable row level security;
revoke all on table public.sellerpilot_sandbox_credit_requests from public,anon,authenticated,service_role;
grant select,insert on table public.sellerpilot_sandbox_credit_requests to service_role;
create index sellerpilot_sandbox_credit_requests_user_time_idx on public.sellerpilot_sandbox_credit_requests(user_id,created_at);
create function public.sellerpilot_v43_subscription_ids(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(q.stripe_subscription_id),'[]'::jsonb)
 from (select distinct e.stripe_subscription_id from public.sellerpilot_stripe_sandbox_events e where e.user_id=p_user_id limit 6) q
$$;
revoke all on function public.sellerpilot_v43_subscription_ids(uuid) from public,anon,authenticated,service_role;
grant execute on function public.sellerpilot_v43_subscription_ids(uuid) to service_role;
create function public.sellerpilot_v43_simulate_credit(p_user_id uuid,p_subscription_id text,p_plan text,p_feature text,p_request_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
 v_now timestamptz; v_day timestamptz; v_month timestamptz; v_daily integer; v_monthly integer; v_units integer; v_daily_used bigint; v_monthly_used bigint;
begin
 if p_user_id is null or p_request_id is null or p_subscription_id is null or p_plan is null or p_feature is null then return false; end if;
 if p_plan='starter' then v_daily:=5; v_monthly:=30;
 elsif p_plan='professional' then v_daily:=15; v_monthly:=100;
 else return false; end if;
 if p_feature='text' then v_units:=1;
 elsif p_feature='photo' and p_plan='professional' then v_units:=3;
 else return false; end if;
 if not exists(select 1 from public.sellerpilot_stripe_sandbox_events where user_id=p_user_id and stripe_subscription_id=p_subscription_id and sandbox is true) then return false; end if;
 -- Serialize all simulated requests for this account; daily/monthly usage survives plan changes.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sellerpilot-sandbox-v43:'||p_user_id::text,0));
 if exists(select 1 from public.sellerpilot_sandbox_credit_requests where user_id=p_user_id and request_id=p_request_id) then return false; end if;
 v_now:=pg_catalog.clock_timestamp();
 v_day:=pg_catalog.date_trunc('day',v_now at time zone 'UTC') at time zone 'UTC';
 v_month:=pg_catalog.date_trunc('month',v_now at time zone 'UTC') at time zone 'UTC';
 select coalesce(sum(credits) filter(where created_at>=v_day),0),coalesce(sum(credits),0)
 into v_daily_used,v_monthly_used from public.sellerpilot_sandbox_credit_requests where user_id=p_user_id and created_at>=v_month;
 if v_daily_used+v_units>v_daily or v_monthly_used+v_units>v_monthly then return false; end if;
 insert into public.sellerpilot_sandbox_credit_requests(user_id,request_id,subscription_id,plan,feature,credits,created_at)
 values(p_user_id,p_request_id,p_subscription_id,p_plan,p_feature,v_units,v_now);
 return true;
end
$$;
revoke all on function public.sellerpilot_v43_simulate_credit(uuid,text,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.sellerpilot_v43_simulate_credit(uuid,text,text,text,uuid) to service_role;
commit;
