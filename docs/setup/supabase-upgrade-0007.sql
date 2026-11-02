-- IBIZA: favoritos; aplicar depois da migration 0006.
BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 7 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='eaaeed05be44759f5975090007c93dfcfea830dbbfb6f9e13a5a3a93b0b4d7fd') THEN RAISE EXCEPTION 'Unexpected migration state'; END IF; END $$;
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
COMMIT;
