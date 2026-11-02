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

CREATE FUNCTION public.update_own_profile(new_display_name text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Confirmed email required';
  END IF;
  IF new_display_name IS NULL OR char_length(trim(new_display_name)) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Invalid display name';
  END IF;
  UPDATE public.profiles SET display_name=trim(new_display_name) WHERE id=actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_own_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('44ecd3fcd605f7d3370ed01354cad46b224096dd421fffe22fe1c8755fa0606b',1793621161902);

ALTER TABLE "listings" ADD COLUMN "location" text DEFAULT '' NOT NULL;

ALTER TABLE "listings" ADD COLUMN "price_minor" integer DEFAULT 0 NOT NULL;

ALTER TABLE "listings" ADD COLUMN "price_unit" text DEFAULT 'pessoa' NOT NULL;

ALTER TABLE "listings" ADD COLUMN "review_status" text DEFAULT 'draft' NOT NULL;

ALTER TABLE "listings" ADD COLUMN "review_notes" text;

ALTER TABLE "listings" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;

ALTER TABLE "listings" ADD CONSTRAINT "listing_price_valid" CHECK ("listings"."price_minor" >= 0);

ALTER TABLE "listings" ADD CONSTRAINT "listing_review_valid" CHECK ("listings"."review_status" IN ('draft','pending','approved','rejected'));


CREATE POLICY managed_listings ON public.listings FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.is_platform_admin());


CREATE FUNCTION public.save_listing(listing_id uuid, org_id uuid, expected_revision integer, listing_title text, listing_description text, listing_category text, listing_location text, amount_minor integer, unit text, submit_review boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); target uuid; current_listing public.listings%ROWTYPE;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed email required'; END IF;
 PERFORM 1 FROM public.organizations WHERE id=org_id AND approval='approved' FOR SHARE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=org_id AND profile_id=actor AND role IN ('owner','manager')) THEN RAISE EXCEPTION 'Approved partner manager required'; END IF;
 IF listing_title IS NULL OR length(trim(listing_title)) NOT BETWEEN 5 AND 120 OR listing_description IS NULL OR length(trim(listing_description)) NOT BETWEEN 30 AND 5000 OR listing_location IS NULL OR length(trim(listing_location)) NOT BETWEEN 2 AND 120 OR listing_category IS NULL OR listing_category NOT IN ('estadias','eventos','restaurantes','experiencias','destinos') OR amount_minor IS NULL OR amount_minor NOT BETWEEN 0 AND 100000000 OR unit IS NULL OR unit NOT IN ('pessoa','noite','entrada','mesa','grupo') OR submit_review IS NULL THEN RAISE EXCEPTION 'Invalid listing'; END IF;
 IF listing_id IS NULL THEN
  target:=gen_random_uuid();
  INSERT INTO public.listings(id,organization_id,slug,title,description,category,location,price_minor,price_unit,review_status) VALUES(target,org_id,target::text,trim(listing_title),trim(listing_description),listing_category::public.listing_category,trim(listing_location),amount_minor,unit,CASE WHEN submit_review THEN 'pending' ELSE 'draft' END);
 ELSE
  SELECT * INTO current_listing FROM public.listings WHERE id=listing_id AND organization_id=org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF expected_revision IS NULL OR current_listing.revision<>expected_revision THEN RAISE EXCEPTION 'Listing changed; reload'; END IF;
  target:=listing_id;
  UPDATE public.listings SET title=trim(listing_title),description=trim(listing_description),category=listing_category::public.listing_category,location=trim(listing_location),price_minor=amount_minor,price_unit=unit,status='draft',review_status=CASE WHEN submit_review THEN 'pending' ELSE 'draft' END,review_notes=NULL,revision=revision+1 WHERE id=target;
 END IF;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(actor,org_id,'listing.saved',jsonb_build_object('listing_id',target,'submitted',submit_review));
 RETURN target;
END;$$;
REVOKE ALL ON FUNCTION public.save_listing(uuid,uuid,integer,text,text,text,text,integer,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_listing(uuid,uuid,integer,text,text,text,text,integer,text,boolean) TO authenticated;


CREATE FUNCTION public.review_listing(listing_id uuid, expected_revision integer, decision text, reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); item public.listings%ROWTYPE;
BEGIN
 IF actor IS NULL OR NOT public.is_platform_admin() OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF decision IS NULL OR decision NOT IN ('approved','rejected') OR reason IS NULL OR length(trim(reason)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT * INTO item FROM public.listings WHERE id=listing_id FOR UPDATE;
 IF NOT FOUND OR item.review_status<>'pending' THEN RAISE EXCEPTION 'Listing not pending'; END IF;
 IF expected_revision IS NULL OR item.revision<>expected_revision THEN RAISE EXCEPTION 'Listing changed; reload'; END IF;
 IF public.is_org_member(item.organization_id) THEN RAISE EXCEPTION 'Cannot review own listing'; END IF;
 UPDATE public.listings SET status=CASE WHEN decision='approved' THEN 'published'::public.listing_status ELSE 'draft'::public.listing_status END,review_status=decision,review_notes=trim(reason),revision=revision+1 WHERE id=listing_id;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(actor,item.organization_id,'listing.reviewed',jsonb_build_object('listing_id',listing_id,'decision',decision,'reason',trim(reason)));
END;$$;
REVOKE ALL ON FUNCTION public.review_listing(uuid,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_listing(uuid,integer,text,text) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('78035d6c661a39c7c5b2fe0ac77f7a381a5e24b1c36a1e60cfe9b1352d9cce2c',1793625996089);

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('listing-photos','listing-photos',false,3145728,ARRAY['image/jpeg','image/png','image/webp']);


CREATE FUNCTION public.can_upload_listing_photo(object_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.listings l JOIN public.organizations o ON o.id=l.organization_id JOIN public.organization_members m ON m.organization_id=o.id JOIN auth.users u ON u.id=m.profile_id WHERE l.id::text=split_part(object_name,'/',1) AND l.status='draft' AND l.review_status IN ('draft','rejected') AND o.approval='approved' AND m.profile_id=auth.uid() AND m.role IN ('owner','manager') AND u.email_confirmed_at IS NOT NULL) AND object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
$$;
REVOKE ALL ON FUNCTION public.can_upload_listing_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_listing_photo(text) TO authenticated;
CREATE POLICY listing_photo_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='listing-photos' AND public.can_upload_listing_photo(name));
CREATE POLICY listing_photo_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='listing-photos' AND EXISTS(SELECT 1 FROM public.listing_photos p WHERE p.storage_path=name));


CREATE FUNCTION public.attach_listing_photo(target_listing uuid, object_name text, alternative_text text, expected_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE; next_position integer;
BEGIN
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR NOT public.can_upload_listing_photo(object_name) OR split_part(object_name,'/',1)<>target_listing::text THEN RAISE EXCEPTION 'Photo access denied'; END IF;
 IF expected_revision IS NULL OR item.revision<>expected_revision THEN RAISE EXCEPTION 'Listing changed; reload'; END IF;
 IF alternative_text IS NULL OR length(trim(alternative_text)) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Invalid photo description'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='listing-photos' AND name=object_name) THEN RAISE EXCEPTION 'Upload missing'; END IF;
 IF EXISTS(SELECT 1 FROM public.listing_photos WHERE storage_path=object_name) THEN RAISE EXCEPTION 'Photo already attached'; END IF;
 SELECT coalesce(max(position),-1)+1 INTO next_position FROM public.listing_photos WHERE listing_id=target_listing;
 IF next_position>=8 THEN RAISE EXCEPTION 'Photo limit reached'; END IF;
 INSERT INTO public.listing_photos(listing_id,storage_path,alt,position) VALUES(target_listing,object_name,trim(alternative_text),next_position);
 UPDATE public.listings SET revision=revision+1 WHERE id=target_listing;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),item.organization_id,'listing.photo_added',jsonb_build_object('listing_id',target_listing));
END;$$;
REVOKE ALL ON FUNCTION public.attach_listing_photo(uuid,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_listing_photo(uuid,text,text,integer) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('eaaeed05be44759f5975090007c93dfcfea830dbbfb6f9e13a5a3a93b0b4d7fd',1793626676261);

CREATE FUNCTION public.set_listing_favorite(target_listing uuid, desired boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed email required'; END IF;
 IF target_listing IS NULL OR desired IS NULL THEN RAISE EXCEPTION 'Invalid favorite'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,7));
 IF NOT desired THEN
  DELETE FROM public.favorites WHERE profile_id=actor AND listing_id=target_listing;
  RETURN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.listings l JOIN public.organizations o ON o.id=l.organization_id WHERE l.id=target_listing AND l.status='published' AND o.approval='approved') THEN RAISE EXCEPTION 'Published offer required'; END IF;
 IF EXISTS(SELECT 1 FROM public.favorites WHERE profile_id=actor AND listing_id=target_listing) THEN RETURN; END IF;
 IF (SELECT count(*) FROM public.favorites WHERE profile_id=actor)>=500 THEN RAISE EXCEPTION 'Favorite limit reached'; END IF;
 INSERT INTO public.favorites(profile_id,listing_id) VALUES(actor,target_listing) ON CONFLICT DO NOTHING;
END;$$;
REVOKE ALL ON FUNCTION public.set_listing_favorite(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_listing_favorite(uuid,boolean) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('683f86cd49c73832afc88a57bac0f56b54c7b60e4fa6885ecf56674432c2acef',1793627189014);

CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"price_minor" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_dates_valid" CHECK ("availability_slots"."ends_at">"availability_slots"."starts_at"),
	CONSTRAINT "slot_capacity_valid" CHECK ("availability_slots"."capacity" BETWEEN 1 AND 10000),
	CONSTRAINT "slot_price_valid" CHECK ("availability_slots"."price_minor" BETWEEN 0 AND 100000000)
);


CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"currency" text DEFAULT 'MZN' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"listing_title" text NOT NULL,
	"customer_name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"customer_note" text DEFAULT '' NOT NULL,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_quantity_valid" CHECK ("reservations"."quantity" BETWEEN 1 AND 20),
	CONSTRAINT "reservation_total_valid" CHECK ("reservations"."total_minor">=0),
	CONSTRAINT "reservation_state_valid" CHECK ("reservations"."status" IN ('pending','confirmed','rejected','cancelled','completed'))
);


ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_slot_id_availability_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."availability_slots"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_profiles_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "slots_listing_start" ON "availability_slots" USING btree ("listing_id","starts_at");

CREATE UNIQUE INDEX "reservation_request_once" ON "reservations" USING btree ("customer_id","request_key");

CREATE INDEX "reservations_slot_state" ON "reservations" USING btree ("slot_id","status");


ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.availability_slots,public.reservations FROM anon,authenticated;
GRANT SELECT ON public.availability_slots,public.reservations TO authenticated;
CREATE FUNCTION public.is_booking_manager(org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members m JOIN auth.users u ON u.id=m.profile_id WHERE m.organization_id=org_id AND m.profile_id=auth.uid() AND m.role IN ('owner','manager') AND u.email_confirmed_at IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION public.is_booking_manager(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_booking_manager(uuid) TO authenticated;
CREATE POLICY manager_slots ON public.availability_slots FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id AND public.is_booking_manager(l.organization_id)) OR public.is_platform_admin());
CREATE POLICY reservation_participants ON public.reservations FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.is_booking_manager(organization_id) OR public.is_platform_admin());
CREATE TRIGGER reservations_updated BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


CREATE FUNCTION public.create_availability(target_listing uuid,period_start timestamptz,period_end timestamptz,unit_capacity integer,unit_price integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE; slot uuid;
BEGIN
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR NOT public.is_booking_manager(item.organization_id) THEN RAISE EXCEPTION 'Manager required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=item.organization_id AND approval='approved') THEN RAISE EXCEPTION 'Approved partner required'; END IF;
 IF item.category='destinos' THEN RAISE EXCEPTION 'Destinations are not bookable'; END IF;
 IF period_start IS NULL OR period_end IS NULL OR period_start<=now() OR period_end<=period_start OR period_end>period_start+interval '90 days' OR period_start>now()+interval '2 years' OR unit_capacity IS NULL OR unit_capacity NOT BETWEEN 1 AND 10000 OR unit_price IS NULL OR unit_price NOT BETWEEN 0 AND 100000000 THEN RAISE EXCEPTION 'Invalid availability'; END IF;
 IF EXISTS(SELECT 1 FROM public.availability_slots s WHERE s.listing_id=target_listing AND (s.active OR EXISTS(SELECT 1 FROM public.reservations r WHERE r.slot_id=s.id AND (r.status='confirmed' OR (r.status='pending' AND r.expires_at>clock_timestamp())))) AND s.starts_at<period_end AND s.ends_at>period_start) THEN RAISE EXCEPTION 'Overlapping period'; END IF;
 IF (SELECT count(*) FROM public.availability_slots WHERE listing_id=target_listing AND active AND ends_at>now())>=365 THEN RAISE EXCEPTION 'Slot limit reached'; END IF;
 INSERT INTO public.availability_slots(listing_id,starts_at,ends_at,capacity,price_minor) VALUES(target_listing,period_start,period_end,unit_capacity,unit_price) RETURNING id INTO slot;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),item.organization_id,'availability.created',jsonb_build_object('slot_id',slot));
 RETURN slot;
END;$$;
REVOKE ALL ON FUNCTION public.create_availability(uuid,timestamptz,timestamptz,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_availability(uuid,timestamptz,timestamptz,integer,integer) TO authenticated;


CREATE FUNCTION public.available_periods(target_listing uuid) RETURNS TABLE(id uuid,starts_at timestamptz,ends_at timestamptz,price_minor integer,remaining integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT s.id,s.starts_at,s.ends_at,s.price_minor,(s.capacity-coalesce((SELECT sum(r.quantity) FROM public.reservations r WHERE r.slot_id=s.id AND (r.status='confirmed' OR (r.status='pending' AND r.expires_at>now()))),0))::integer
 FROM public.availability_slots s JOIN public.listings l ON l.id=s.listing_id JOIN public.organizations o ON o.id=l.organization_id
 WHERE l.id=target_listing AND l.status='published' AND o.approval='approved' AND s.active AND s.starts_at>now() ORDER BY s.starts_at,s.id LIMIT 365
$$;
REVOKE ALL ON FUNCTION public.available_periods(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.available_periods(uuid) TO anon,authenticated;


CREATE FUNCTION public.request_reservation(target_slot uuid,units integer,note text,idempotency_key uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); slot public.availability_slots%ROWTYPE; item public.listings%ROWTYPE; existing public.reservations%ROWTYPE; allocated bigint; reservation uuid; display_name text;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed email required'; END IF;
 IF target_slot IS NULL OR units IS NULL OR units NOT BETWEEN 1 AND 20 OR note IS NULL OR length(note)>1000 OR idempotency_key IS NULL THEN RAISE EXCEPTION 'Invalid request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,8));
 SELECT * INTO existing FROM public.reservations WHERE customer_id=actor AND request_key=idempotency_key;
 IF FOUND THEN
  IF existing.slot_id<>target_slot OR existing.quantity<>units OR existing.customer_note<>trim(note) THEN RAISE EXCEPTION 'Request key reused'; END IF;
  RETURN existing.id;
 END IF;
 SELECT * INTO slot FROM public.availability_slots WHERE id=target_slot FOR UPDATE;
 IF NOT FOUND OR NOT slot.active OR slot.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'Period unavailable'; END IF;
 SELECT * INTO item FROM public.listings WHERE id=slot.listing_id AND status='published' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
 PERFORM 1 FROM public.organizations WHERE id=item.organization_id AND approval='approved' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partner unavailable'; END IF;
 IF public.is_org_member(item.organization_id) THEN RAISE EXCEPTION 'Cannot book own offer'; END IF;
 IF EXISTS(SELECT 1 FROM public.reservations WHERE customer_id=actor AND slot_id=target_slot AND (status='confirmed' OR (status='pending' AND expires_at>now()))) THEN RAISE EXCEPTION 'Active request exists'; END IF;
 IF (SELECT count(*) FROM public.reservations WHERE customer_id=actor AND status='pending' AND expires_at>now())>=5 THEN RAISE EXCEPTION 'Pending request limit reached'; END IF;
 SELECT coalesce(sum(quantity),0) INTO allocated FROM public.reservations WHERE slot_id=target_slot AND (status='confirmed' OR (status='pending' AND expires_at>now()));
 IF allocated+units>slot.capacity THEN RAISE EXCEPTION 'Insufficient capacity'; END IF;
 SELECT p.display_name INTO display_name FROM public.profiles p WHERE p.id=actor;
 INSERT INTO public.reservations(slot_id,listing_id,organization_id,customer_id,request_key,quantity,total_minor,expires_at,listing_title,customer_name,starts_at,ends_at,customer_note)
 VALUES(slot.id,item.id,item.organization_id,actor,idempotency_key,units,slot.price_minor*units,least(now()+interval '24 hours',slot.starts_at),item.title,display_name,slot.starts_at,slot.ends_at,trim(note)) RETURNING id INTO reservation;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(actor,item.organization_id,'reservation.requested',jsonb_build_object('reservation_id',reservation,'slot_id',slot.id));
 RETURN reservation;
END;$$;
REVOKE ALL ON FUNCTION public.request_reservation(uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_reservation(uuid,integer,text,uuid) TO authenticated;


CREATE FUNCTION public.decide_reservation(target_reservation uuid,decision text,reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); booking public.reservations%ROWTYPE; selected_slot uuid; manager boolean;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed email required'; END IF;
 IF decision IS NULL OR decision NOT IN ('confirmed','rejected','cancelled','completed') OR reason IS NULL OR length(trim(reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT slot_id INTO selected_slot FROM public.reservations WHERE id=target_reservation;
 PERFORM 1 FROM public.availability_slots WHERE id=selected_slot FOR UPDATE;
 SELECT * INTO booking FROM public.reservations WHERE id=target_reservation FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation unavailable'; END IF;
 manager:=public.is_booking_manager(booking.organization_id);
 IF NOT manager AND booking.customer_id<>actor THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT manager AND decision<>'cancelled' THEN RAISE EXCEPTION 'Manager required'; END IF;
 IF booking.status=decision THEN RETURN; END IF;
 IF booking.status='pending' AND booking.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Request expired'; END IF;
 IF decision IN ('confirmed','rejected') AND (booking.status<>'pending' OR booking.starts_at<=clock_timestamp()) THEN RAISE EXCEPTION 'Request not pending'; END IF;
 IF decision='confirmed' AND NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=booking.organization_id AND approval='approved') THEN RAISE EXCEPTION 'Partner not approved'; END IF;
 IF decision='cancelled' AND (booking.status NOT IN ('pending','confirmed') OR booking.starts_at<=clock_timestamp()) THEN RAISE EXCEPTION 'Cancellation unavailable'; END IF;
 IF decision='completed' AND (booking.status<>'confirmed' OR booking.ends_at>clock_timestamp()) THEN RAISE EXCEPTION 'Completion unavailable'; END IF;
 UPDATE public.reservations SET status=decision,decision_note=trim(reason) WHERE id=target_reservation;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(actor,booking.organization_id,'reservation.'||decision,jsonb_build_object('reservation_id',target_reservation,'reason',trim(reason)));
END;$$;
REVOKE ALL ON FUNCTION public.decide_reservation(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_reservation(uuid,text,text) TO authenticated;


CREATE FUNCTION public.close_availability(target_slot uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE slot public.availability_slots%ROWTYPE; org uuid;
BEGIN
 SELECT * INTO slot FROM public.availability_slots WHERE id=target_slot FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Period unavailable'; END IF;
 SELECT organization_id INTO org FROM public.listings WHERE id=slot.listing_id;
 IF NOT public.is_booking_manager(org) THEN RAISE EXCEPTION 'Manager required'; END IF;
 IF NOT slot.active THEN RETURN; END IF;
 UPDATE public.availability_slots SET active=false WHERE id=target_slot;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),org,'availability.closed',jsonb_build_object('slot_id',target_slot));
END;$$;
REVOKE ALL ON FUNCTION public.close_availability(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_availability(uuid) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('f7041ee92f216f47282b853afd86bd52f2b3e2e81e32152574def78312dc5a57',1793629851185);

-- Tombstones prevent a concurrent attachment from reviving a file queued for deletion.
CREATE TABLE public.photo_deletions(storage_path text PRIMARY KEY,listing_id uuid NOT NULL REFERENCES public.listings(id),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.photo_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photo_deletions FROM anon,authenticated;
CREATE FUNCTION public.photo_deletion_allowed(object_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.photo_deletions d JOIN public.listings l ON l.id=d.listing_id WHERE d.storage_path=object_name AND public.is_booking_manager(l.organization_id))
$$;
REVOKE ALL ON FUNCTION public.photo_deletion_allowed(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.photo_deletion_allowed(text) TO authenticated;
CREATE POLICY photo_cleanup_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='listing-photos' AND public.photo_deletion_allowed(name));
CREATE POLICY photo_cleanup_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='listing-photos' AND public.photo_deletion_allowed(name));
ALTER FUNCTION public.attach_listing_photo(uuid,text,text,integer) RENAME TO attach_listing_photo_internal;
REVOKE ALL ON FUNCTION public.attach_listing_photo_internal(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.attach_listing_photo(target_listing uuid,object_name text,alternative_text text,expected_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.photo_deletions WHERE storage_path=object_name) THEN RAISE EXCEPTION 'Photo scheduled for deletion'; END IF;
 PERFORM public.attach_listing_photo_internal(target_listing,object_name,alternative_text,expected_revision);
END;$$;
REVOKE ALL ON FUNCTION public.attach_listing_photo(uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.attach_listing_photo(uuid,text,text,integer) TO authenticated;
CREATE FUNCTION public.manage_listing_photos(target_listing uuid,expected_revision integer,ordered_photos uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE;
BEGIN
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR NOT public.is_booking_manager(item.organization_id) OR item.status<>'draft' OR item.review_status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'Draft manager required'; END IF;
 IF expected_revision IS NULL OR item.revision<>expected_revision THEN RAISE EXCEPTION 'Listing changed'; END IF;
 IF ordered_photos IS NULL OR cardinality(ordered_photos)>8 OR cardinality(ordered_photos)<>(SELECT count(DISTINCT id) FROM unnest(ordered_photos) id) OR EXISTS(SELECT 1 FROM unnest(ordered_photos) x(id) WHERE NOT EXISTS(SELECT 1 FROM public.listing_photos p WHERE p.id=x.id AND p.listing_id=target_listing)) THEN RAISE EXCEPTION 'Invalid photo selection'; END IF;
 INSERT INTO public.photo_deletions(storage_path,listing_id) SELECT storage_path,listing_id FROM public.listing_photos WHERE listing_id=target_listing AND NOT(id=ANY(ordered_photos)) ON CONFLICT DO NOTHING;
 DELETE FROM public.listing_photos WHERE listing_id=target_listing AND NOT(id=ANY(ordered_photos));
 UPDATE public.listing_photos SET position=position+100 WHERE listing_id=target_listing;
 UPDATE public.listing_photos p SET position=ordered.ordinality-1 FROM unnest(ordered_photos) WITH ORDINALITY ordered(id,ordinality) WHERE p.id=ordered.id AND p.listing_id=target_listing;
 UPDATE public.listings SET revision=revision+1 WHERE id=target_listing;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),item.organization_id,'listing.photos_updated',jsonb_build_object('listing_id',target_listing,'photos',ordered_photos));
END;$$;
REVOKE ALL ON FUNCTION public.manage_listing_photos(uuid,integer,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_listing_photos(uuid,integer,uuid[]) TO authenticated;
CREATE FUNCTION public.claim_photo_cleanup(target_listing uuid) RETURNS TABLE(storage_path text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE;
BEGIN
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR NOT public.is_booking_manager(item.organization_id) THEN RAISE EXCEPTION 'Manager required'; END IF;
 -- A listing lock serializes cleanup with attachment. Attached files are never claimed.
 INSERT INTO public.photo_deletions(storage_path,listing_id)
 SELECT o.name,target_listing FROM storage.objects o WHERE o.bucket_id='listing-photos' AND split_part(o.name,'/',1)=target_listing::text AND NOT EXISTS(SELECT 1 FROM public.listing_photos p WHERE p.storage_path=o.name) LIMIT 100 ON CONFLICT DO NOTHING;
 RETURN QUERY SELECT d.storage_path FROM public.photo_deletions d JOIN storage.objects o ON o.name=d.storage_path AND o.bucket_id='listing-photos' WHERE d.listing_id=target_listing LIMIT 100;
END;$$;
REVOKE ALL ON FUNCTION public.claim_photo_cleanup(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_photo_cleanup(uuid) TO authenticated;
CREATE FUNCTION public.archive_listing(target_listing uuid,expected_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE;
BEGIN
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR NOT public.is_booking_manager(item.organization_id) THEN RAISE EXCEPTION 'Manager required'; END IF;
 IF expected_revision IS NULL OR item.revision<>expected_revision THEN RAISE EXCEPTION 'Listing changed'; END IF;
 UPDATE public.listings SET status='archived',review_status='draft',revision=revision+1 WHERE id=target_listing;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),item.organization_id,'listing.archived',jsonb_build_object('listing_id',target_listing));
END;$$;
REVOKE ALL ON FUNCTION public.archive_listing(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.archive_listing(uuid,integer) TO authenticated;
CREATE FUNCTION public.set_partner_active(target_org uuid,activate boolean,reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.organizations%ROWTYPE;
BEGIN
 IF NOT public.is_platform_admin() OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 SELECT * INTO item FROM public.organizations WHERE id=target_org FOR UPDATE;
 IF NOT FOUND OR public.is_org_member(target_org) THEN RAISE EXCEPTION 'Independent administrator required'; END IF;
 IF activate IS NULL OR reason IS NULL OR length(trim(reason)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Reason required'; END IF;
 IF (activate AND item.approval<>'suspended') OR (NOT activate AND item.approval<>'approved') THEN RAISE EXCEPTION 'Invalid partner transition'; END IF;
 UPDATE public.organizations SET approval=CASE WHEN activate THEN 'approved'::public.approval_status ELSE 'suspended'::public.approval_status END WHERE id=target_org;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),target_org,'partner.status_changed',jsonb_build_object('active',activate,'reason',trim(reason)));
END;$$;
REVOKE ALL ON FUNCTION public.set_partner_active(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_partner_active(uuid,boolean,text) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('83c27caddd5d9b49bdacf77edf1d07b55a0f32a4a1235ebaec9e9c70f2fe1965',1793634062534);

CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,reservation_id uuid REFERENCES public.reservations(id),title text NOT NULL,body text NOT NULL,href text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX notifications_recipient ON public.notifications(profile_id,created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon,authenticated;
GRANT SELECT ON public.notifications TO authenticated;
CREATE POLICY own_notifications ON public.notifications FOR SELECT TO authenticated USING(profile_id=auth.uid());
CREATE FUNCTION public.mark_notification_read(target_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ UPDATE public.notifications SET read_at=coalesce(read_at,now()) WHERE id=target_id AND profile_id=auth.uid() $$;
REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
CREATE FUNCTION public.notify_reservation_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient uuid; heading text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW; END IF;
 heading=CASE NEW.status WHEN 'pending' THEN 'Pedido de reserva recebido' WHEN 'confirmed' THEN 'Reserva confirmada' WHEN 'rejected' THEN 'Pedido de reserva recusado' WHEN 'cancelled' THEN 'Reserva cancelada' ELSE 'Reserva concluída' END;
 INSERT INTO public.notifications(profile_id,reservation_id,title,body,href) VALUES(NEW.customer_id,NEW.id,heading,NEW.listing_title,'/reservas');
 FOR recipient IN SELECT profile_id FROM public.organization_members WHERE organization_id=NEW.organization_id AND role IN ('owner','manager') AND profile_id<>NEW.customer_id LOOP
 INSERT INTO public.notifications(profile_id,reservation_id,title,body,href) VALUES(recipient,NEW.id,heading,NEW.listing_title,'/business/reservas');
 END LOOP;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.notify_reservation_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_reservation AFTER INSERT OR UPDATE OF status ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.notify_reservation_change();

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('cf910a8167640d34637ca61b75747eb481459ec29c1c0fdc7b4691c943a0a89b',1793634166839);

CREATE TABLE public.ticket_categories(slot_id uuid PRIMARY KEY REFERENCES public.availability_slots(id),name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80));
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ticket_categories TO anon,authenticated;
CREATE POLICY category_read ON public.ticket_categories FOR SELECT USING(EXISTS(SELECT 1 FROM public.availability_slots s JOIN public.listings l ON l.id=s.listing_id WHERE s.id=slot_id));
-- Public category labels follow the listing visibility, without exposing private inventory.
CREATE FUNCTION public.event_categories(target_listing uuid) RETURNS TABLE(slot_id uuid,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT c.slot_id,c.name FROM public.ticket_categories c JOIN public.availability_slots s ON s.id=c.slot_id JOIN public.listings l ON l.id=s.listing_id JOIN public.organizations o ON o.id=l.organization_id WHERE l.id=target_listing AND l.status='published' AND o.approval='approved' $$;
REVOKE ALL ON FUNCTION public.event_categories(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_categories(uuid) TO anon,authenticated;
CREATE FUNCTION public.create_ticket_category(target_listing uuid,category_name text,period_start timestamptz,period_end timestamptz,unit_capacity integer,unit_price integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE; slot uuid;
BEGIN
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR item.category<>'eventos' OR NOT public.is_booking_manager(item.organization_id) OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=item.organization_id AND approval='approved') THEN RAISE EXCEPTION 'Approved event manager required'; END IF;
 IF category_name IS NULL OR length(trim(category_name)) NOT BETWEEN 2 AND 80 OR period_start IS NULL OR period_end IS NULL OR period_start<=now() OR period_start>now()+interval '2 years' OR period_end<=period_start OR period_end>period_start+interval '7 days' OR unit_capacity IS NULL OR unit_capacity NOT BETWEEN 1 AND 10000 OR unit_price IS NULL OR unit_price NOT BETWEEN 0 AND 100000000 THEN RAISE EXCEPTION 'Invalid category'; END IF;
 IF (SELECT count(*) FROM public.availability_slots WHERE listing_id=target_listing AND ends_at>now())>=100 THEN RAISE EXCEPTION 'Category limit reached'; END IF;
 INSERT INTO public.availability_slots(listing_id,starts_at,ends_at,capacity,price_minor) VALUES(target_listing,period_start,period_end,unit_capacity,unit_price) RETURNING id INTO slot;
 INSERT INTO public.ticket_categories VALUES(slot,trim(category_name));
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),item.organization_id,'ticket.category_created',jsonb_build_object('slot_id',slot,'name',trim(category_name)));
 RETURN slot;
END;$$;
REVOKE ALL ON FUNCTION public.create_ticket_category(uuid,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_ticket_category(uuid,text,timestamptz,timestamptz,integer,integer) TO authenticated;
CREATE TABLE public.tickets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reservation_id uuid NOT NULL REFERENCES public.reservations(id),customer_id uuid NOT NULL REFERENCES public.profiles(id),ordinal integer NOT NULL,token text NOT NULL UNIQUE DEFAULT(gen_random_uuid()::text||gen_random_uuid()::text),checked_in_at timestamptz,checked_in_by uuid REFERENCES public.profiles(id),UNIQUE(reservation_id,ordinal));
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tickets FROM anon,authenticated;
GRANT SELECT ON public.tickets TO authenticated;
CREATE POLICY own_tickets ON public.tickets FOR SELECT TO authenticated USING(customer_id=auth.uid());
CREATE FUNCTION public.issue_free_tickets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status='confirmed' AND NEW.total_minor=0 AND EXISTS(SELECT 1 FROM public.ticket_categories WHERE slot_id=NEW.slot_id) THEN
 INSERT INTO public.tickets(reservation_id,customer_id,ordinal) SELECT NEW.id,NEW.customer_id,n FROM generate_series(1,NEW.quantity) n ON CONFLICT(reservation_id,ordinal) DO NOTHING;
 END IF;RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.issue_free_tickets() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER issue_tickets AFTER INSERT OR UPDATE OF status ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.issue_free_tickets();
CREATE FUNCTION public.check_in_ticket(qr_token text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.tickets%ROWTYPE; r public.reservations%ROWTYPE;
BEGIN
 IF qr_token IS NULL OR length(qr_token)<>72 THEN RETURN 'invalid'; END IF;
 SELECT * INTO t FROM public.tickets WHERE token=qr_token;
 IF NOT FOUND THEN RETURN 'invalid'; END IF;
 SELECT * INTO r FROM public.reservations WHERE id=t.reservation_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.organization_members m JOIN auth.users u ON u.id=m.profile_id JOIN public.organizations o ON o.id=m.organization_id WHERE m.organization_id=r.organization_id AND m.profile_id=auth.uid() AND m.role IN ('owner','manager','scanner') AND u.email_confirmed_at IS NOT NULL AND o.approval='approved') THEN RETURN 'invalid'; END IF;
 IF r.status<>'confirmed' OR r.total_minor<>0 OR r.starts_at>clock_timestamp()+interval '2 hours' OR r.ends_at<=clock_timestamp() THEN RETURN 'inactive'; END IF;
 SELECT * INTO t FROM public.tickets WHERE id=t.id FOR UPDATE;
 IF t.checked_in_at IS NOT NULL THEN RETURN 'used'; END IF;
 UPDATE public.tickets SET checked_in_at=clock_timestamp(),checked_in_by=auth.uid() WHERE id=t.id;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),r.organization_id,'ticket.checked_in',jsonb_build_object('ticket_id',t.id,'reservation_id',r.id));
 RETURN 'accepted';
END;$$;
REVOKE ALL ON FUNCTION public.check_in_ticket(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(text) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('e46f68bf412b1b59f78ac358b32fb01e40f6965a62779f35ec61832d95163f6f',1793634280720);

CREATE TABLE public.stay_nights(listing_id uuid NOT NULL REFERENCES public.listings(id),night date NOT NULL,capacity integer NOT NULL CHECK(capacity BETWEEN 0 AND 10000),price_minor integer NOT NULL CHECK(price_minor BETWEEN 0 AND 100000000),PRIMARY KEY(listing_id,night));
CREATE TABLE public.stay_rules(listing_id uuid PRIMARY KEY REFERENCES public.listings(id),weekly_discount integer NOT NULL DEFAULT 0 CHECK(weekly_discount BETWEEN 0 AND 90),monthly_discount integer NOT NULL DEFAULT 0 CHECK(monthly_discount BETWEEN 0 AND 90));
ALTER TABLE public.stay_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stay_nights,public.stay_rules FROM anon,authenticated;
GRANT SELECT ON public.stay_nights,public.stay_rules TO authenticated;
CREATE POLICY manager_nights ON public.stay_nights FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id AND public.is_booking_manager(l.organization_id)));
CREATE POLICY manager_stay_rules ON public.stay_rules FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id AND public.is_booking_manager(l.organization_id)));
CREATE FUNCTION public.set_stay_inventory(target_listing uuid,first_night date,last_night date,unit_capacity integer,nightly_price integer,weekly integer,monthly integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE; day date; used bigint;
BEGIN
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR item.category<>'estadias' OR NOT public.is_booking_manager(item.organization_id) OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=item.organization_id AND approval='approved') THEN RAISE EXCEPTION 'Approved stay manager required'; END IF;
 IF first_night IS NULL OR last_night IS NULL OR first_night< (now() AT TIME ZONE 'Africa/Maputo')::date OR last_night<first_night OR last_night-first_night>365 OR last_night>(now() AT TIME ZONE 'Africa/Maputo')::date+730 OR unit_capacity IS NULL OR unit_capacity NOT BETWEEN 0 AND 10000 OR nightly_price IS NULL OR nightly_price NOT BETWEEN 0 AND 100000000 OR weekly IS NULL OR weekly NOT BETWEEN 0 AND 90 OR monthly IS NULL OR monthly NOT BETWEEN 0 AND 90 THEN RAISE EXCEPTION 'Invalid inventory'; END IF;
 FOR day IN SELECT generate_series(first_night::timestamp,last_night::timestamp,interval '1 day')::date LOOP
 SELECT coalesce(sum(quantity),0) INTO used FROM public.reservations WHERE listing_id=target_listing AND (status='confirmed' OR (status='pending' AND expires_at>clock_timestamp())) AND (starts_at AT TIME ZONE 'Africa/Maputo')::date<=day AND (ends_at AT TIME ZONE 'Africa/Maputo')::date>day;
 IF unit_capacity<used THEN RAISE EXCEPTION 'Capacity below existing reservations'; END IF;
 INSERT INTO public.stay_nights VALUES(target_listing,day,unit_capacity,nightly_price) ON CONFLICT(listing_id,night) DO UPDATE SET capacity=excluded.capacity,price_minor=excluded.price_minor;
 END LOOP;
 INSERT INTO public.stay_rules VALUES(target_listing,weekly,monthly) ON CONFLICT(listing_id) DO UPDATE SET weekly_discount=excluded.weekly_discount,monthly_discount=excluded.monthly_discount;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),item.organization_id,'stay.inventory_updated',jsonb_build_object('listing_id',target_listing,'from',first_night,'to',last_night));
END;$$;
REVOKE ALL ON FUNCTION public.set_stay_inventory(uuid,date,date,integer,integer,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_stay_inventory(uuid,date,date,integer,integer,integer,integer) TO authenticated;
CREATE FUNCTION public.quote_stay(target_listing uuid,arrival date,departure date) RETURNS TABLE(nights integer,remaining integer,unit_total bigint,discount integer) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE rate integer; count_nights integer; total bigint; vacancies integer;
BEGIN
 IF arrival IS NULL OR departure IS NULL OR arrival<(now() AT TIME ZONE 'Africa/Maputo')::date+1 OR departure<=arrival OR departure-arrival>90 THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.listings l JOIN public.organizations o ON o.id=l.organization_id WHERE l.id=target_listing AND l.category='estadias' AND l.status='published' AND o.approval='approved') THEN RETURN; END IF;
 SELECT count(*)::integer,sum(n.price_minor),min(n.capacity-coalesce((SELECT sum(r.quantity) FROM public.reservations r WHERE r.listing_id=target_listing AND (r.status='confirmed' OR (r.status='pending' AND r.expires_at>now())) AND (r.starts_at AT TIME ZONE 'Africa/Maputo')::date<=n.night AND (r.ends_at AT TIME ZONE 'Africa/Maputo')::date>n.night),0))::integer INTO count_nights,total,vacancies FROM public.stay_nights n WHERE n.listing_id=target_listing AND n.night>=arrival AND n.night<departure;
 IF count_nights<>departure-arrival THEN RETURN; END IF;
 SELECT CASE WHEN departure-arrival>=28 THEN monthly_discount WHEN departure-arrival>=7 THEN weekly_discount ELSE 0 END INTO rate FROM public.stay_rules WHERE listing_id=target_listing;
 RETURN QUERY SELECT count_nights,greatest(0,vacancies),round(total*(100-coalesce(rate,0))/100.0)::bigint,coalesce(rate,0);
END;$$;
REVOKE ALL ON FUNCTION public.quote_stay(uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_stay(uuid,date,date) TO anon,authenticated;
CREATE FUNCTION public.request_stay(target_listing uuid,arrival date,departure date,units integer,note text,idempotency_key uuid,expected_total bigint) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings%ROWTYPE; quote record; existing public.reservations%ROWTYPE; slot uuid; booking uuid; actor uuid=auth.uid(); start_time timestamptz; end_time timestamptz;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed email required'; END IF;
 IF units IS NULL OR units NOT BETWEEN 1 AND 20 OR note IS NULL OR length(note)>1000 OR idempotency_key IS NULL THEN RAISE EXCEPTION 'Invalid request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,8));
 start_time=(arrival::timestamp+interval '14 hours') AT TIME ZONE 'Africa/Maputo';end_time=(departure::timestamp+interval '10 hours') AT TIME ZONE 'Africa/Maputo';
 SELECT * INTO existing FROM public.reservations WHERE customer_id=actor AND request_key=idempotency_key;
 IF FOUND THEN IF existing.listing_id<>target_listing OR existing.starts_at<>start_time OR existing.ends_at<>end_time OR existing.quantity<>units OR existing.customer_note<>trim(note) THEN RAISE EXCEPTION 'Request key reused'; END IF; RETURN existing.id; END IF;
 SELECT * INTO item FROM public.listings WHERE id=target_listing FOR UPDATE;
 IF NOT FOUND OR public.is_org_member(item.organization_id) THEN RAISE EXCEPTION 'Invalid stay'; END IF;
 PERFORM 1 FROM public.organizations WHERE id=item.organization_id AND approval='approved' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partner unavailable'; END IF;
 -- Existing fixed periods must be closed before switching this listing to nightly sales.
 IF EXISTS(SELECT 1 FROM public.availability_slots WHERE listing_id=target_listing AND active AND ends_at>now()) THEN RAISE EXCEPTION 'Close legacy periods first'; END IF;
 IF (SELECT count(*) FROM public.reservations WHERE customer_id=actor AND status='pending' AND expires_at>clock_timestamp())>=5 THEN RAISE EXCEPTION 'Pending limit reached'; END IF;
 SELECT * INTO quote FROM public.quote_stay(target_listing,arrival,departure);
 IF NOT FOUND OR quote.remaining<units OR quote.unit_total>100000000 OR quote.unit_total*units>2147483647 OR expected_total IS NULL OR expected_total<>quote.unit_total*units THEN RAISE EXCEPTION 'Price or availability changed'; END IF;
 INSERT INTO public.availability_slots(listing_id,starts_at,ends_at,capacity,price_minor,active) VALUES(target_listing,start_time,end_time,units,quote.unit_total,false) RETURNING id INTO slot;
 INSERT INTO public.reservations(slot_id,listing_id,organization_id,customer_id,request_key,quantity,total_minor,status,expires_at,listing_title,customer_name,starts_at,ends_at,customer_note) VALUES(slot,target_listing,item.organization_id,actor,idempotency_key,units,quote.unit_total*units,'pending',least(clock_timestamp()+interval '24 hours',start_time),item.title,(SELECT display_name FROM public.profiles WHERE id=actor),start_time,end_time,trim(note)) RETURNING id INTO booking;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(actor,item.organization_id,'reservation.requested',jsonb_build_object('reservation_id',booking,'nights',quote.nights));
 RETURN booking;
END;$$;
REVOKE ALL ON FUNCTION public.request_stay(uuid,date,date,integer,text,uuid,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_stay(uuid,date,date,integer,text,uuid,bigint) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('0d1111f0066dc3626c3f7e22140a0109895da46cc461cba91f90bd281c159e8a',1793634396559);

CREATE FUNCTION public.is_org_owner(target_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.organization_members m JOIN auth.users u ON u.id=m.profile_id WHERE m.organization_id=target_org AND m.profile_id=auth.uid() AND m.role='owner' AND u.email_confirmed_at IS NOT NULL) $$;
REVOKE ALL ON FUNCTION public.is_org_owner(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated;
CREATE POLICY owner_memberships ON public.organization_members FOR SELECT TO authenticated USING(public.is_org_owner(organization_id));
CREATE FUNCTION public.manage_team(target_org uuid,member_id uuid,member_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.organizations WHERE id=target_org AND approval='approved' FOR UPDATE;
 IF NOT FOUND OR NOT public.is_org_owner(target_org) THEN RAISE EXCEPTION 'Approved owner required'; END IF;
 IF member_id IS NULL OR member_id=auth.uid() OR member_role IS NULL OR member_role NOT IN ('manager','staff','scanner','remove') THEN RAISE EXCEPTION 'Invalid member'; END IF;
 IF EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=target_org AND profile_id=member_id AND role='owner') THEN RAISE EXCEPTION 'Owner cannot be modified'; END IF;
 IF member_role='remove' THEN DELETE FROM public.organization_members WHERE organization_id=target_org AND profile_id=member_id;
 ELSE
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=member_id AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed account required'; END IF;
 INSERT INTO public.organization_members(organization_id,profile_id,role) VALUES(target_org,member_id,member_role::public.member_role) ON CONFLICT(organization_id,profile_id) DO UPDATE SET role=excluded.role;
 END IF;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),target_org,'partner.team_updated',jsonb_build_object('member_id',member_id,'role',member_role));
END;$$;
REVOKE ALL ON FUNCTION public.manage_team(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_team(uuid,uuid,text) TO authenticated;
CREATE FUNCTION public.support_reservation(target_reservation uuid,cancel_booking boolean,reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE booking public.reservations%ROWTYPE; slot uuid;
BEGIN
 IF NOT public.is_platform_admin() OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF cancel_booking IS NULL OR reason IS NULL OR length(trim(reason)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Reason required'; END IF;
 SELECT slot_id INTO slot FROM public.reservations WHERE id=target_reservation;
 PERFORM 1 FROM public.availability_slots WHERE id=slot FOR UPDATE;
 SELECT * INTO booking FROM public.reservations WHERE id=target_reservation FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation unavailable'; END IF;
 IF cancel_booking THEN
 IF booking.status NOT IN ('pending','confirmed') OR EXISTS(SELECT 1 FROM public.tickets WHERE reservation_id=booking.id AND checked_in_at IS NOT NULL) THEN RAISE EXCEPTION 'Cancellation unavailable'; END IF;
 UPDATE public.reservations SET status='cancelled',decision_note=trim(reason) WHERE id=booking.id;
 END IF;
 INSERT INTO public.audit_logs(actor_id,organization_id,action,details) VALUES(auth.uid(),booking.organization_id,'reservation.support',jsonb_build_object('reservation_id',booking.id,'cancelled',cancel_booking,'reason',trim(reason)));
END;$$;
REVOKE ALL ON FUNCTION public.support_reservation(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.support_reservation(uuid,boolean,text) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('593d33e2d4f63e282f15230d360d03e4579044a30f116555988845b814da922f',1793634471052);

CREATE TABLE public.notification_email_jobs(notification_id uuid PRIMARY KEY REFERENCES public.notifications(id) ON DELETE CASCADE,attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),lease_id uuid,leased_until timestamptz,sent_at timestamptz,last_error text);
ALTER TABLE public.notification_email_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_email_jobs FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.enqueue_notification_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN INSERT INTO public.notification_email_jobs(notification_id) VALUES(NEW.id); RETURN NEW; END;$$;
REVOKE ALL ON FUNCTION public.enqueue_notification_email() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enqueue_email AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_email();

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('ec08acd5339884a767efdf14a8142c2deb1bcc58044f2d59048067ae11bb4bff',1793634571969);

ALTER TABLE drizzle.__drizzle_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON drizzle.__drizzle_migrations FROM anon, authenticated;
COMMIT;
