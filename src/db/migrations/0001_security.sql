-- Custom SQL migration file, put your code below! --
-- Supabase auth.users and roles must exist before this migration.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_user_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Phase 1 is read-only. No client receives mutation privileges or policies.
REVOKE ALL ON public.profiles,public.organizations,public.organization_members,public.partner_applications,public.destinations,public.listings,public.listing_photos,public.favorites FROM anon,authenticated;
GRANT SELECT ON public.destinations,public.organizations,public.listings,public.listing_photos TO anon,authenticated;
GRANT SELECT ON public.profiles,public.organization_members,public.partner_applications,public.favorites TO authenticated;
--> statement-breakpoint
CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated USING (id=(SELECT auth.uid()));
CREATE POLICY own_memberships ON public.organization_members FOR SELECT TO authenticated USING (profile_id=(SELECT auth.uid()));
CREATE POLICY own_applications ON public.partner_applications FOR SELECT TO authenticated USING (submitted_by=(SELECT auth.uid()));
CREATE POLICY own_favorites ON public.favorites FOR SELECT TO authenticated USING (profile_id=(SELECT auth.uid()));
CREATE POLICY approved_organizations ON public.organizations FOR SELECT TO anon,authenticated USING (approval='approved');
CREATE POLICY public_destinations ON public.destinations FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY approved_published_listings ON public.listings FOR SELECT TO anon,authenticated USING (status='published' AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id=organization_id AND o.approval='approved'));
CREATE POLICY public_listing_photos ON public.listing_photos FOR SELECT TO anon,authenticated USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id=listing_id));
--> statement-breakpoint
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
--> statement-breakpoint
CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER organizations_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER applications_updated BEFORE UPDATE ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER destinations_updated BEFORE UPDATE ON public.destinations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
