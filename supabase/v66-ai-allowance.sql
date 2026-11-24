-- Read-only, service-role-only view of the current user's real AI allowance.
-- Existing atomic reservation function remains the enforcement authority.
begin;
create function public.sellerpilot_ai_allowance(p_user_id uuid,p_daily_cap integer,p_monthly_cap integer,p_user_cap integer)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 d date := (now() at time zone 'UTC')::date;
 month_start date := date_trunc('month',(now() at time zone 'UTC'))::date;
 day_total bigint;
 month_total bigint;
 user_total bigint;
 user_left integer;
 effective_left integer;
begin
 if p_user_id is null or p_daily_cap is null or p_monthly_cap is null or p_user_cap is null
 or p_daily_cap not between 1 and 10 or p_monthly_cap not between 1 and 100 or p_user_cap not between 1 and 3 then return null; end if;
 select coalesce(sum(calls) filter(where day=d),0), coalesce(sum(calls),0),
 coalesce(sum(calls) filter(where day=d and user_id=p_user_id),0)
 into day_total,month_total,user_total from sellerpilot_ai_private.usage_by_day where day>=month_start and day<=d;
 user_left:=greatest(0,p_user_cap-user_total);
 effective_left:=greatest(0,least(user_left,p_daily_cap-day_total,p_monthly_cap-month_total));
 return jsonb_build_object('personal_daily_limit',p_user_cap,'personal_daily_remaining',user_left,
 'available_requests',effective_left,'daily_reset_utc',to_char(d+1,'YYYY-MM-DD')||'T00:00:00Z',
 'monthly_reset_utc',to_char((month_start+interval '1 month')::date,'YYYY-MM-DD')||'T00:00:00Z',
 'monthly_exhausted',month_total>=p_monthly_cap);
end;
$$;
revoke all on function public.sellerpilot_ai_allowance(uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.sellerpilot_ai_allowance(uuid,integer,integer,integer) to service_role;
commit;
