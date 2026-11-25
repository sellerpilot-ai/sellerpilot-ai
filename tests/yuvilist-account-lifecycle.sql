-- Disposable schema model only. Never execute in a Supabase project.
\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database() <> 'yuvilist_lifecycle_fixture' OR to_regnamespace('auth') IS NOT NULL THEN
  RAISE EXCEPTION 'Refusing to run outside fresh lifecycle fixture';
 END IF;
END $$;
BEGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('fixture.user_id',true),'')::uuid
$$;
CREATE ROLE lifecycle_authenticated NOLOGIN;
CREATE ROLE lifecycle_anon NOLOGIN;
GRANT USAGE ON SCHEMA auth TO lifecycle_authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO lifecycle_authenticated;
CREATE SCHEMA sellerpilot_ai_private;
CREATE SCHEMA sellerpilot_demand_private;
-- Minimal model of the six verified live FK relationships, not a production schema dump.
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['public.products','public.sellerpilot_workspace_v19','public.sellerpilot_research_usage','public.sellerpilot_sandbox_credit_requests','public.sellerpilot_stripe_sandbox_events','sellerpilot_demand_private.requests'] LOOP
  EXECUTE format('CREATE TABLE %s (id integer PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, payload text NOT NULL)',t);
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON %s FROM PUBLIC, lifecycle_authenticated, lifecycle_anon',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['public.products','public.sellerpilot_workspace_v19'] LOOP
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO lifecycle_authenticated',t);
  EXECUTE format('CREATE POLICY owner_select ON %s FOR SELECT TO lifecycle_authenticated USING ((SELECT auth.uid())=user_id)',t);
  EXECUTE format('CREATE POLICY owner_insert ON %s FOR INSERT TO lifecycle_authenticated WITH CHECK ((SELECT auth.uid())=user_id)',t);
  EXECUTE format('CREATE POLICY owner_update ON %s FOR UPDATE TO lifecycle_authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id)',t);
  EXECUTE format('CREATE POLICY owner_delete ON %s FOR DELETE TO lifecycle_authenticated USING ((SELECT auth.uid())=user_id)',t);
 END LOOP;
END $$;
CREATE TABLE sellerpilot_ai_private.usage_by_day(user_id uuid NOT NULL, day date NOT NULL, requests int NOT NULL, PRIMARY KEY(user_id,day));
ALTER TABLE sellerpilot_ai_private.usage_by_day ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sellerpilot_ai_private.usage_by_day FROM PUBLIC,lifecycle_authenticated,lifecycle_anon;
INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['public.products','public.sellerpilot_workspace_v19','public.sellerpilot_research_usage','public.sellerpilot_sandbox_credit_requests','public.sellerpilot_stripe_sandbox_events','sellerpilot_demand_private.requests'] LOOP
  EXECUTE format('INSERT INTO %s VALUES (1,$1,$2),(2,$3,$4)',t) USING '11111111-1111-4111-8111-111111111111'::uuid,'fixture A','22222222-2222-4222-8222-222222222222'::uuid,'fixture B';
 END LOOP;
END $$;
INSERT INTO sellerpilot_ai_private.usage_by_day VALUES ('11111111-1111-4111-8111-111111111111',CURRENT_DATE,1),('22222222-2222-4222-8222-222222222222',CURRENT_DATE,2);
SET ROLE lifecycle_anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM public.products; RAISE EXCEPTION 'Anon SELECT allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE lifecycle_authenticated;
SELECT set_config('fixture.user_id','11111111-1111-4111-8111-111111111111',true);
DO $$
DECLARE t text; n int;
BEGIN
 FOREACH t IN ARRAY ARRAY['public.products','public.sellerpilot_workspace_v19'] LOOP
  EXECUTE format('SELECT count(*) FROM %s',t) INTO n;
  IF n<>1 THEN RAISE EXCEPTION 'Cross-owner SELECT: %',t; END IF;
  EXECUTE format('UPDATE %s SET payload=$1 WHERE id=2',t) USING 'forbidden';
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Cross-owner UPDATE: %',t; END IF;
  EXECUTE format('DELETE FROM %s WHERE id=2',t);
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Cross-owner DELETE: %',t; END IF;
  BEGIN EXECUTE format('INSERT INTO %s VALUES(3,$1,$2)',t) USING '22222222-2222-4222-8222-222222222222'::uuid,'forbidden'; RAISE EXCEPTION 'Cross-owner INSERT: %',t; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN EXECUTE format('UPDATE %s SET user_id=$1 WHERE id=1',t) USING '22222222-2222-4222-8222-222222222222'::uuid; RAISE EXCEPTION 'Owner reassignment: %',t; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE format('UPDATE %s SET payload=$1 WHERE id=1',t) USING 'own edit';
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Own UPDATE failed: %',t; END IF;
 END LOOP;
 BEGIN PERFORM 1 FROM public.sellerpilot_stripe_sandbox_events; RAISE EXCEPTION 'Private billing data exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM sellerpilot_ai_private.usage_by_day; RAISE EXCEPTION 'Private AI usage exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
-- Demonstrate actual cascade relationships and non-cascading usage in fixture.
DELETE FROM auth.users WHERE id='11111111-1111-4111-8111-111111111111';
DO $$
DECLARE t text; n int;
BEGIN
 FOREACH t IN ARRAY ARRAY['public.products','public.sellerpilot_workspace_v19','public.sellerpilot_research_usage','public.sellerpilot_sandbox_credit_requests','public.sellerpilot_stripe_sandbox_events','sellerpilot_demand_private.requests'] LOOP
  EXECUTE format('SELECT count(*) FROM %s WHERE user_id=$1',t) INTO n USING '11111111-1111-4111-8111-111111111111'::uuid;
  IF n<>0 THEN RAISE EXCEPTION 'Cascade failed: %',t; END IF;
  EXECUTE format('SELECT count(*) FROM %s WHERE user_id=$1 AND payload=$2',t) INTO n USING '22222222-2222-4222-8222-222222222222'::uuid,'fixture B';
  IF n<>1 THEN RAISE EXCEPTION 'Unrelated fixture altered: %',t; END IF;
 END LOOP;
 IF (SELECT count(*) FROM sellerpilot_ai_private.usage_by_day WHERE user_id='11111111-1111-4111-8111-111111111111')<>1 THEN RAISE EXCEPTION 'Expected non-cascading AI usage'; END IF;
END $$;
DELETE FROM sellerpilot_ai_private.usage_by_day WHERE user_id='11111111-1111-4111-8111-111111111111';
DO $$ BEGIN
 IF (SELECT count(*) FROM sellerpilot_ai_private.usage_by_day)<>1 OR NOT EXISTS(SELECT 1 FROM sellerpilot_ai_private.usage_by_day WHERE user_id='22222222-2222-4222-8222-222222222222' AND requests=2) THEN RAISE EXCEPTION 'AI cleanup was not owner scoped'; END IF;
END $$;
-- Model a still-valid deleted-user JWT claim. Owner read returns none; FK rejects re-creation.
SET ROLE lifecycle_authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.products) THEN RAISE EXCEPTION 'Deleted user still sees catalogue'; END IF;
 BEGIN INSERT INTO public.products VALUES(3,'11111111-1111-4111-8111-111111111111','stale fixture'); RAISE EXCEPTION 'Deleted user could recreate product'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'PASS YuviList lifecycle MODEL: cross-owner writes denied, six cascades, scoped non-cascade cleanup, stale identity cannot recreate product, other account unchanged.'
