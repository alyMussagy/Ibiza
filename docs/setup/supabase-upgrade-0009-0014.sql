BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 9 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='f7041ee92f216f47282b853afd86bd52f2b3e2e81e32152574def78312dc5a57') THEN RAISE EXCEPTION 'Expected migration 0008; stop and verify migration history'; END IF; END $$;
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
COMMIT;
SELECT count(*) AS migrations FROM drizzle.__drizzle_migrations;
