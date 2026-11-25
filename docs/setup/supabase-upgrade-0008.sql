-- IBIZA: reservas por períodos; aplicar depois da migration 0007.
BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 8 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='683f86cd49c73832afc88a57bac0f56b54c7b60e4fa6885ecf56674432c2acef') THEN RAISE EXCEPTION 'Unexpected migration state'; END IF; END $$;
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
COMMIT;
