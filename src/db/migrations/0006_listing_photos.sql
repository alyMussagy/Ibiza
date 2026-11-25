INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('listing-photos','listing-photos',false,3145728,ARRAY['image/jpeg','image/png','image/webp']);
--> statement-breakpoint
CREATE FUNCTION public.can_upload_listing_photo(object_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.listings l JOIN public.organizations o ON o.id=l.organization_id JOIN public.organization_members m ON m.organization_id=o.id JOIN auth.users u ON u.id=m.profile_id WHERE l.id::text=split_part(object_name,'/',1) AND l.status='draft' AND l.review_status IN ('draft','rejected') AND o.approval='approved' AND m.profile_id=auth.uid() AND m.role IN ('owner','manager') AND u.email_confirmed_at IS NOT NULL) AND object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
$$;
REVOKE ALL ON FUNCTION public.can_upload_listing_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_listing_photo(text) TO authenticated;
CREATE POLICY listing_photo_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='listing-photos' AND public.can_upload_listing_photo(name));
CREATE POLICY listing_photo_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='listing-photos' AND EXISTS(SELECT 1 FROM public.listing_photos p WHERE p.storage_path=name));
--> statement-breakpoint
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
