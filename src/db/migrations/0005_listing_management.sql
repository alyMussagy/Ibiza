ALTER TABLE "listings" ADD COLUMN "location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "price_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "price_unit" text DEFAULT 'pessoa' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "review_status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listing_price_valid" CHECK ("listings"."price_minor" >= 0);--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listing_review_valid" CHECK ("listings"."review_status" IN ('draft','pending','approved','rejected'));
--> statement-breakpoint
CREATE POLICY managed_listings ON public.listings FOR SELECT TO authenticated USING (public.is_org_member(organization_id) OR public.is_platform_admin());
--> statement-breakpoint
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
--> statement-breakpoint
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
