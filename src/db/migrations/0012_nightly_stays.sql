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
