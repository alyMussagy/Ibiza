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
