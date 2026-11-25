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
