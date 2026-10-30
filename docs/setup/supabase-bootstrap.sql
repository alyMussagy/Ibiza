-- IBIZA: executar apenas num projecto Supabase NOVO e vazio.
-- Todas as migrations e o journal são aplicados numa única transacção.
BEGIN;
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations(id serial PRIMARY KEY,hash text NOT NULL,created_at bigint);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations) THEN RAISE EXCEPTION 'Project already migrated: use npm run db:migrate'; END IF; END $$;
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');

CREATE TYPE "public"."listing_category" AS ENUM('destinos', 'estadias', 'eventos', 'restaurantes', 'experiencias');

CREATE TYPE "public"."listing_status" AS ENUM('draft', 'published', 'archived');

CREATE TYPE "public"."member_role" AS ENUM('owner', 'manager', 'staff', 'scanner');

CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"province" text DEFAULT 'Inhambane' NOT NULL,
	"country" text DEFAULT 'MZ' NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "destinations_slug_unique" UNIQUE("slug")
);


CREATE TABLE "favorites" (
	"profile_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_profile_id_listing_id_pk" PRIMARY KEY("profile_id","listing_id")
);


CREATE TABLE "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"alt" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "photo_position_positive" CHECK ("listing_photos"."position" >= 0)
);


CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"destination_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "listing_category" NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'MZN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug"),
	CONSTRAINT "currency_format" CHECK ("listings"."currency" ~ '^[A-Z]{3}$')
);


CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'staff' NOT NULL,
	CONSTRAINT "organization_members_organization_id_profile_id_pk" PRIMARY KEY("organization_id","profile_id")
);


CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"approval" "approval_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);


CREATE TABLE "partner_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "favorites" ADD CONSTRAINT "favorites_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "listings" ADD CONSTRAINT "listings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "listings" ADD CONSTRAINT "listings_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_submitted_by_profiles_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "listing_photo_order" ON "listing_photos" USING btree ("listing_id","position");
INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('c52dcc0dd1f783f80b31e08dfc9fc866c6273450f9013bec89641c7340f03248',1793353293053);

-- Custom SQL migration file, put your code below! --
-- Supabase auth.users and roles must exist before this migration.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;


-- Phase 1 is read-only. No client receives mutation privileges or policies.
REVOKE ALL ON public.profiles,public.organizations,public.organization_members,public.partner_applications,public.destinations,public.listings,public.listing_photos,public.favorites FROM anon,authenticated;
GRANT SELECT ON public.destinations,public.organizations,public.listings,public.listing_photos TO anon,authenticated;
GRANT SELECT ON public.profiles,public.organization_members,public.partner_applications,public.favorites TO authenticated;


CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated USING (id=(SELECT auth.uid()));
CREATE POLICY own_memberships ON public.organization_members FOR SELECT TO authenticated USING (profile_id=(SELECT auth.uid()));
CREATE POLICY own_applications ON public.partner_applications FOR SELECT TO authenticated USING (submitted_by=(SELECT auth.uid()));
CREATE POLICY own_favorites ON public.favorites FOR SELECT TO authenticated USING (profile_id=(SELECT auth.uid()));
CREATE POLICY approved_organizations ON public.organizations FOR SELECT TO anon,authenticated USING (approval='approved');
CREATE POLICY public_destinations ON public.destinations FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY approved_published_listings ON public.listings FOR SELECT TO anon,authenticated USING (status='published' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id=organization_id AND o.approval='approved'));
CREATE POLICY public_listing_photos ON public.listing_photos FOR SELECT TO anon,authenticated USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id=listing_id));


CREATE FUNCTION public.require_approved_partner() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.status='published' THEN
    PERFORM 1 FROM public.organizations WHERE id=NEW.organization_id AND approval='approved' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Partner approval required before publication'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER listings_approval_guard BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.require_approved_partner();


CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER organizations_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER applications_updated BEFORE UPDATE ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER destinations_updated BEFORE UPDATE ON public.destinations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('175e77a7b37d065840055ad30f10c398610e20eb621c112360f5c2af3ed852eb',1793353322883);

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"organization_id" uuid,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "partner_details" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"business_type" "listing_category" NOT NULL,
	"contact_email" text NOT NULL,
	"phone" text NOT NULL,
	"location" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "platform_roles" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_role_allowed" CHECK ("platform_roles"."role" IN ('support','finance','super_admin'))
);


ALTER TABLE "partner_details" ADD CONSTRAINT "partner_details_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "platform_roles" ADD CONSTRAINT "platform_roles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('b869a0f0c0dc4603079097563a180b900cf41182300504cb9df03f502c9fdbb7',1793356109544);

-- Custom SQL migration file, put your code below! --
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_roles,public.partner_details,public.audit_logs FROM anon,authenticated;
GRANT SELECT ON public.platform_roles,public.partner_details,public.audit_logs TO authenticated;


CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.platform_roles WHERE profile_id=(SELECT auth.uid()) AND role='super_admin')
$$;
CREATE FUNCTION public.is_org_member(org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=org_id AND profile_id=(SELECT auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(),public.is_org_member(uuid) TO authenticated;


CREATE POLICY own_platform_role ON public.platform_roles FOR SELECT TO authenticated USING (profile_id=(SELECT auth.uid()));
CREATE POLICY member_organizations ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id) OR public.is_platform_admin());
CREATE POLICY admin_applications ON public.partner_applications FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY private_business_details ON public.partner_details FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.is_platform_admin());
CREATE POLICY admin_audit ON public.audit_logs FOR SELECT TO authenticated USING (public.is_platform_admin());


CREATE FUNCTION public.create_auth_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.profiles(id,display_name) VALUES (NEW.id,coalesce(nullif(left(trim(NEW.raw_user_meta_data->>'display_name'),100),''),'Viajante')) ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.create_auth_profile() FROM PUBLIC;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_auth_profile();
INSERT INTO public.profiles(id,display_name) SELECT id,coalesce(nullif(left(trim(raw_user_meta_data->>'display_name'),100),''),'Viajante') FROM auth.users ON CONFLICT(id) DO NOTHING;


CREATE FUNCTION public.submit_partner_application(business_name text,business_type text,contact_email text,phone_number text,business_location text,business_description text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); org uuid; application uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 -- Serializes submissions by the same user and verifies confirmed identity.
 PERFORM 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Confirmed email required'; END IF;
 IF business_name IS NULL OR length(trim(business_name)) NOT BETWEEN 2 AND 120 OR business_type IS NULL OR business_type NOT IN ('estadias','eventos','restaurantes','experiencias') OR contact_email IS NULL OR length(contact_email)>254 OR contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' OR phone_number IS NULL OR phone_number !~ '^[+0-9 ()-]{7,30}$' OR business_location IS NULL OR length(trim(business_location)) NOT BETWEEN 2 AND 160 OR business_description IS NULL OR length(trim(business_description)) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'Invalid application'; END IF;
 IF EXISTS(SELECT 1 FROM public.partner_applications WHERE submitted_by=actor AND status='pending') THEN RAISE EXCEPTION 'Pending application already exists'; END IF;
 IF (SELECT count(*) FROM public.partner_applications WHERE submitted_by=actor AND created_at>now()-interval '24 hours')>=3 THEN RAISE EXCEPTION 'Application limit reached'; END IF;
 INSERT INTO public.organizations(name,slug) VALUES(trim(business_name),'parceiro-'||gen_random_uuid()::text) RETURNING id INTO org;
 INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES(org,actor,'owner');
 INSERT INTO public.partner_details(organization_id,business_type,contact_email,phone,location,description) VALUES(org,business_type::public.listing_category,trim(contact_email),trim(phone_number),trim(business_location),trim(business_description));
 INSERT INTO public.partner_applications(organization_id,submitted_by) VALUES(org,actor) RETURNING id INTO application;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(actor,org,'partner.submitted',jsonb_build_object('application_id',application));
 RETURN application;
END;$$;
REVOKE ALL ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) TO authenticated;


CREATE FUNCTION public.review_partner_application(application_id uuid,decision text,reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); application public.partner_applications%ROWTYPE;
BEGIN
 IF actor IS NULL OR NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF decision IS NULL OR decision NOT IN ('approved','rejected') OR reason IS NULL OR length(trim(reason)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT * INTO application FROM public.partner_applications WHERE id=application_id FOR UPDATE;
 IF NOT FOUND OR application.status<>'pending' THEN RAISE EXCEPTION 'Application not pending'; END IF;
 IF application.submitted_by=actor OR public.is_org_member(application.organization_id) THEN RAISE EXCEPTION 'Cannot review own organization'; END IF;
 UPDATE public.partner_applications SET status=decision::public.approval_status,notes=trim(reason) WHERE id=application_id;
 UPDATE public.organizations SET approval=decision::public.approval_status WHERE id=application.organization_id;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(actor,application.organization_id,'partner.reviewed',jsonb_build_object('application_id',application_id,'decision',decision,'reason',trim(reason)));
END;$$;
REVOKE ALL ON FUNCTION public.review_partner_application(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_partner_application(uuid,text,text) TO authenticated;


CREATE FUNCTION public.prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Audit log is append-only'; END;$$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();
CREATE TRIGGER partner_details_updated BEFORE UPDATE ON public.partner_details FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('39c6f42d37593e28c3a8b102b3da3ab74d41de1f96b7dc189de10d936d70316b',1793356169052);

COMMIT;
