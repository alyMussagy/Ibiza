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
