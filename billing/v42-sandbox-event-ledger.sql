-- Review and apply separately after isolated tests. No entitlement grants.
begin;
create table public.sellerpilot_stripe_sandbox_events (
 event_id text primary key check(event_id ~ '^evt_[A-Za-z0-9_]+$'),
 event_type text not null check(event_type in ('checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed')),
 event_created_at timestamptz not null,
 observed_at timestamptz not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 stripe_subscription_id text not null check(stripe_subscription_id ~ '^sub_[A-Za-z0-9_]+$'),
 stripe_customer_id text not null check(stripe_customer_id ~ '^cus_[A-Za-z0-9_]+$'),
 plan text not null check(plan in ('starter','professional')),
 subscription_status text not null check(subscription_status in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused','unknown')),
 price_matches boolean not null,
 latest_invoice_paid boolean not null,
 period_end timestamptz,
 cancel_at_period_end boolean not null,
 sandbox boolean not null default true check(sandbox is true)
);
alter table public.sellerpilot_stripe_sandbox_events enable row level security;
revoke all on table public.sellerpilot_stripe_sandbox_events from public,anon,authenticated,service_role;
grant select,insert on table public.sellerpilot_stripe_sandbox_events to service_role;
create index sellerpilot_stripe_sandbox_events_user_idx on public.sellerpilot_stripe_sandbox_events(user_id, observed_at desc);
commit;
