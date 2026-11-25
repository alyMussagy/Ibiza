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
