-- Custom SQL migration file, put your code below! --
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_roles,public.partner_details,public.audit_logs FROM anon,authenticated;
GRANT SELECT ON public.platform_roles,public.partner_details,public.audit_logs TO authenticated;
--> statement-breakpoint
CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.platform_roles WHERE profile_id=(SELECT auth.uid()) AND role='super_admin')
$$;
CREATE FUNCTION public.is_org_member(org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=org_id AND profile_id=(SELECT auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(),public.is_org_member(uuid) TO authenticated;
--> statement-breakpoint
CREATE POLICY own_platform_role ON public.platform_roles FOR SELECT TO authenticated USING (profile_id=(SELECT auth.uid()));
CREATE POLICY member_organizations ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id) OR public.is_platform_admin());
CREATE POLICY admin_applications ON public.partner_applications FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY private_business_details ON public.partner_details FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.is_platform_admin());
CREATE POLICY admin_audit ON public.audit_logs FOR SELECT TO authenticated USING (public.is_platform_admin());
--> statement-breakpoint
CREATE FUNCTION public.create_auth_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.profiles(id,display_name) VALUES (NEW.id,coalesce(nullif(left(trim(NEW.raw_user_meta_data->>'display_name'),100),''),'Viajante')) ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION public.create_auth_profile() FROM PUBLIC;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_auth_profile();
INSERT INTO public.profiles(id,display_name) SELECT id,coalesce(nullif(left(trim(raw_user_meta_data->>'display_name'),100),''),'Viajante') FROM auth.users ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE FUNCTION public.prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Audit log is append-only'; END;$$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();
CREATE TRIGGER partner_details_updated BEFORE UPDATE ON public.partner_details FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
