-- V67 private trial: 5 lifetime paid tasks maximum, no automated retries.
begin;
create schema sellerpilot_demand_private;
revoke all on schema sellerpilot_demand_private from public,anon,authenticated;
grant usage on schema sellerpilot_demand_private to service_role;
create table sellerpilot_demand_private.requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 cache_key text not null check(cache_key ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 result jsonb,
 completed_at timestamptz
);
-- Separate counter does not reset when users are deleted.
create table sellerpilot_demand_private.trial_budget (
 singleton boolean primary key check(singleton),
 reserved integer not null check(reserved between 0 and 5)
);
insert into sellerpilot_demand_private.trial_budget values(true,0);
alter table sellerpilot_demand_private.requests enable row level security;
alter table sellerpilot_demand_private.trial_budget enable row level security;
revoke all on all tables in schema sellerpilot_demand_private from public,anon,authenticated;
grant select,insert,update on sellerpilot_demand_private.requests to service_role;
grant select,update on sellerpilot_demand_private.trial_budget to service_role;
create index demand_cache_lookup on sellerpilot_demand_private.requests(user_id,cache_key,created_at desc);
create function public.sellerpilot_demand_begin(p_user_id uuid,p_cache_key text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r sellerpilot_demand_private.requests%rowtype; used integer;
begin
 if p_user_id is null or p_cache_key is null or p_cache_key !~ '^[a-f0-9]{64}$' then return null; end if;
 select reserved into used from sellerpilot_demand_private.trial_budget where singleton for update;
 if used is null then return null; end if;
 select * into r from sellerpilot_demand_private.requests where user_id=p_user_id and cache_key=p_cache_key and result is not null and completed_at>now()-interval '30 days' order by completed_at desc limit 1;
 if found then return jsonb_build_object('state','cached','result',r.result); end if;
 if exists(select 1 from sellerpilot_demand_private.requests where user_id=p_user_id and cache_key=p_cache_key and completed_at is null and created_at>now()-interval '2 minutes') then return jsonb_build_object('state','pending');end if;
 if used>=5 then return jsonb_build_object('state','exhausted');end if;
 update sellerpilot_demand_private.trial_budget set reserved=reserved+1 where singleton;
 insert into sellerpilot_demand_private.requests(user_id,cache_key) values(p_user_id,p_cache_key) returning * into r;
 return jsonb_build_object('state','reserved','request_id',r.id);
end;
$$;
create function public.sellerpilot_demand_finish(p_user_id uuid,p_request_id uuid,p_result jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_result is not null and (jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>100000) then return false;end if;
 update sellerpilot_demand_private.requests set result=p_result,completed_at=now() where id=p_request_id and user_id=p_user_id and completed_at is null;
 get diagnostics n=row_count;return n=1;
end;
$$;
revoke all on function public.sellerpilot_demand_begin(uuid,text),public.sellerpilot_demand_finish(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.sellerpilot_demand_begin(uuid,text),public.sellerpilot_demand_finish(uuid,uuid,jsonb) to service_role;
commit;
