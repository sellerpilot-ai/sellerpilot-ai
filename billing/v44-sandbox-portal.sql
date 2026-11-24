-- Candidate: service-only unique sandbox customer lookup, depends on V42 ledger.
begin;
create function public.sellerpilot_v44_unique_customer(p_user_id uuid)
returns text language sql stable security invoker set search_path='' as $$
 with own as (
   select distinct stripe_customer_id from public.sellerpilot_stripe_sandbox_events
   where user_id=p_user_id and sandbox is true
 ), single_customer as (
   select min(stripe_customer_id) as id from own having count(*)=1
 )
 select s.id from single_customer s
 where not exists(select 1 from public.sellerpilot_stripe_sandbox_events e
 where e.stripe_customer_id=s.id and e.user_id<>p_user_id)
$$;
revoke all on function public.sellerpilot_v44_unique_customer(uuid) from public,anon,authenticated,service_role;
grant execute on function public.sellerpilot_v44_unique_customer(uuid) to service_role;
commit;
