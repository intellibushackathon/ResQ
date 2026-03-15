


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'public',
    'staff',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."damage_type" AS ENUM (
    'flooding',
    'roof_collapse',
    'debris_tree',
    'utility_damage',
    'other'
);


ALTER TYPE "public"."damage_type" OWNER TO "postgres";


CREATE TYPE "public"."department_code" AS ENUM (
    'nwa',
    'jps',
    'odpem',
    'none'
);


ALTER TYPE "public"."department_code" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'pending_validation',
    'verified',
    'resolved'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


CREATE TYPE "public"."severity_level" AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."severity_level" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_role"() RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'public'::public.app_role
  );
$$;


ALTER FUNCTION "public"."current_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_app_role() = 'admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff_or_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.current_app_role() in ('staff', 'admin');
$$;


ALTER FUNCTION "public"."is_staff_or_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


ALTER TABLE "public"."audit_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "display_name" "text",
    "role" "public"."app_role" DEFAULT 'public'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "staff_org" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_ai_analyses" (
    "report_id" "uuid" NOT NULL,
    "confidence" numeric(5,4),
    "summary" "text",
    "rationale" "text",
    "hazards" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "suggested_department" "public"."department_code" DEFAULT 'none'::"public"."department_code" NOT NULL,
    "suggested_actions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "provider" "text" NOT NULL,
    "model" "text" NOT NULL,
    "analyzed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."report_ai_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "photo_path" "text" NOT NULL,
    "damage_type" "public"."damage_type" NOT NULL,
    "severity" "public"."severity_level" NOT NULL,
    "description" "text" NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "reported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."report_status" DEFAULT 'pending_validation'::"public"."report_status" NOT NULL,
    "department_routing" "public"."department_code" DEFAULT 'none'::"public"."department_code" NOT NULL,
    "verified_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location_name" "text"
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "privacy_mode" boolean DEFAULT true NOT NULL,
    "auto_confirm" boolean DEFAULT false NOT NULL,
    "sms_alerts" boolean DEFAULT true NOT NULL,
    "rate_limit" integer DEFAULT 72 NOT NULL,
    "lockdown_mode" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "single_row" CHECK (("id" = 1))
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_ai_analyses"
    ADD CONSTRAINT "report_ai_analyses_pkey" PRIMARY KEY ("report_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reports_set_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_ai_analyses"
    ADD CONSTRAINT "report_ai_analyses_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Authenticated users can read system_settings" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update system_settings" ON "public"."system_settings" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_admin_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "audit_logs_staff_admin_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff_or_admin"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_select_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "profiles_admin_update_all" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("role" = ( SELECT "p"."role"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())))));



ALTER TABLE "public"."report_ai_analyses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_ai_staff_admin_insert" ON "public"."report_ai_analyses" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_staff_or_admin"());



CREATE POLICY "report_ai_staff_admin_select" ON "public"."report_ai_analyses" FOR SELECT TO "authenticated" USING ("public"."is_staff_or_admin"());



CREATE POLICY "report_ai_staff_admin_update" ON "public"."report_ai_analyses" FOR UPDATE TO "authenticated" USING ("public"."is_staff_or_admin"()) WITH CHECK ("public"."is_staff_or_admin"());



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_insert_own" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("submitted_by" = "auth"."uid"()));



CREATE POLICY "reports_select_own" ON "public"."reports" FOR SELECT TO "authenticated" USING (("submitted_by" = "auth"."uid"()));



CREATE POLICY "reports_staff_admin_select_all" ON "public"."reports" FOR SELECT TO "authenticated" USING ("public"."is_staff_or_admin"());



CREATE POLICY "reports_staff_admin_update" ON "public"."reports" FOR UPDATE TO "authenticated" USING ("public"."is_staff_or_admin"()) WITH CHECK ("public"."is_staff_or_admin"());



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."current_app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_staff_or_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_staff_or_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff_or_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."report_ai_analyses" TO "anon";
GRANT ALL ON TABLE "public"."report_ai_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."report_ai_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


  create policy "storage_report_images_delete_own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'report-images'::text) AND (owner_id = (auth.uid())::text)));



  create policy "storage_report_images_insert_own_folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'report-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "storage_report_images_select_own"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'report-images'::text) AND (owner_id = (auth.uid())::text)));



  create policy "storage_report_images_select_staff_admin"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'report-images'::text) AND public.is_staff_or_admin()));



