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
reset role;
-- Account deletion removes pending material.
delete from auth.users where id='11111111-1111-4111-8111-111111111111';
do $$ begin if exists(select 1 from sellerpilot_etsy_private.authorization where user_id='11111111-1111-4111-8111-111111111111') then raise exception 'account cascade'; end if; end $$;
\echo PASS V193: permissions, expiry, ownership, replay, replacement, daily quota, cleanup, account deletion
