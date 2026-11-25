\set ON_ERROR_STOP on
-- Disposable database only. Never run this script against the live project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
\ir ../launch/v192-etsy-authorization-draft.sql
do $$
begin
 if has_schema_privilege('anon','sellerpilot_etsy_private','USAGE') or has_schema_privilege('authenticated','sellerpilot_etsy_private','USAGE') then raise exception 'schema exposed'; end if;
 if has_function_privilege('anon','public.sellerpilot_etsy_begin(uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.sellerpilot_etsy_begin(uuid,text,text)','EXECUTE')
 or has_function_privilege('anon','public.sellerpilot_etsy_consume(uuid,text)','EXECUTE') or has_function_privilege('authenticated','public.sellerpilot_etsy_consume(uuid,text)','EXECUTE')
 or has_function_privilege('anon','public.sellerpilot_etsy_cleanup()','EXECUTE') or has_function_privilege('authenticated','public.sellerpilot_etsy_cleanup()','EXECUTE') then raise exception 'RPC exposed'; end if;
 if not (select relrowsecurity from pg_class where oid='sellerpilot_etsy_private.authorization'::regclass) then raise exception 'RLS disabled'; end if;
end $$;
set role service_role;
do $$
declare a uuid:='11111111-1111-4111-8111-111111111111'; b uuid:='22222222-2222-4222-8222-222222222222'; v text:=repeat('a',64);
begin
 if public.sellerpilot_etsy_begin(a,'bad',v) is distinct from false then raise exception 'invalid input'; end if;
 if public.sellerpilot_etsy_begin(a,repeat('1',64),v) is distinct from true then raise exception 'begin'; end if;
 if public.sellerpilot_etsy_consume(b,repeat('1',64)) is not null then raise exception 'wrong user'; end if;
 if public.sellerpilot_etsy_consume(a,repeat('2',64)) is not null then raise exception 'wrong state'; end if;
 if public.sellerpilot_etsy_consume(a,repeat('1',64)) is distinct from v then raise exception 'consume'; end if;
 if public.sellerpilot_etsy_consume(a,repeat('1',64)) is not null then raise exception 'replay'; end if;
 if public.sellerpilot_etsy_begin(a,repeat('2',64),v) is distinct from true then raise exception 'second begin'; end if;
 if public.sellerpilot_etsy_begin(a,repeat('3',64),v) is distinct from true then raise exception 'replacement'; end if;
 if public.sellerpilot_etsy_consume(a,repeat('2',64)) is not null then raise exception 'old state retained'; end if;
 update sellerpilot_etsy_private.authorization set expires_at=clock_timestamp()-interval '1 second' where user_id=a;
 if public.sellerpilot_etsy_consume(a,repeat('3',64)) is not null then raise exception 'expired state'; end if;
 if public.sellerpilot_etsy_begin(a,repeat('4',64),v) is distinct from true or public.sellerpilot_etsy_begin(a,repeat('5',64),v) is distinct from true then raise exception 'quota premature'; end if;
 if public.sellerpilot_etsy_begin(a,repeat('6',64),v) is distinct from false then raise exception 'quota exceeded'; end if;
 if public.sellerpilot_etsy_consume(a,repeat('5',64)) is distinct from v then raise exception 'quota rejection clobbered pending'; end if;
 if public.sellerpilot_etsy_begin(b,repeat('7',64),v) is distinct from true then raise exception 'independent user quota'; end if;
 update sellerpilot_etsy_private.authorization set expires_at=clock_timestamp()-interval '1 second' where user_id=b;
 perform public.sellerpilot_etsy_cleanup();
 if exists(select 1 from sellerpilot_etsy_private.authorization where verifier is not null or state_hash is not null) then raise exception 'cleanup failed'; end if;
 if public.sellerpilot_etsy_begin(a,repeat('8',64),v) is distinct from false then raise exception 'cleanup reset quota'; end if;
 update sellerpilot_etsy_private.authorization set quota_day=quota_day-1 where user_id=a;
 if public.sellerpilot_etsy_begin(a,repeat('8',64),v) is distinct from true then raise exception 'next UTC day'; end if;
end $$;
-- V198: cleanup removes old inactive quota records but leaves fresh state and quota intact.
do $
declare a uuid:='11111111-1111-4111-8111-111111111111'; b uuid:='22222222-2222-4222-8222-222222222222';
begin
 update sellerpilot_etsy_private.authorization set quota_day=quota_day-2 where user_id=b;
 perform public.sellerpilot_etsy_cleanup();
 perform public.sellerpilot_etsy_cleanup();
 if exists(select 1 from sellerpilot_etsy_private.authorization where user_id=b) then raise exception 'old inactive quota retained'; end if;
 if not exists(select 1 from sellerpilot_etsy_private.authorization where user_id=a and attempts=1 and state_hash=repeat('8',64) and verifier=repeat('a',64) and expires_at>clock_timestamp()) then raise exception 'fresh state or quota lost during cleanup'; end if;
end $;
reset role;
-- Account deletion removes pending material.
delete from auth.users where id='11111111-1111-4111-8111-111111111111';
do $$ begin if exists(select 1 from sellerpilot_etsy_private.authorization where user_id='11111111-1111-4111-8111-111111111111') then raise exception 'account cascade'; end if; end $$;
\echo PASS V193: permissions, expiry, ownership, replay, replacement, daily quota, cleanup, account deletion

-- V199: test the narrow rollback from the installation review, with unrelated objects present.
create table public.unrelated_fixture(id integer primary key);
insert into public.unrelated_fixture values (42);
begin;
drop function public.sellerpilot_etsy_cleanup();
drop function public.sellerpilot_etsy_consume(uuid,text);
drop function public.sellerpilot_etsy_begin(uuid,text,text);
drop table sellerpilot_etsy_private.authorization;
drop schema sellerpilot_etsy_private;
commit;
do $$
begin
 if to_regnamespace('sellerpilot_etsy_private') is not null
 or to_regprocedure('public.sellerpilot_etsy_begin(uuid,text,text)') is not null
 or to_regprocedure('public.sellerpilot_etsy_consume(uuid,text)') is not null
 or to_regprocedure('public.sellerpilot_etsy_cleanup()') is not null then raise exception 'rollback left preview objects'; end if;
 if not exists(select 1 from public.unrelated_fixture where id=42)
 or not exists(select 1 from auth.users where id='22222222-2222-4222-8222-222222222222') then raise exception 'rollback damaged unrelated data'; end if;
end $$;
\echo PASS V198/V199: idempotent cleanup preserves fresh state, prunes old quota, scoped rollback preserves unrelated data
