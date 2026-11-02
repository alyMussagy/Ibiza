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
