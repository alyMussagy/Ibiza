-- First-party, session-level traffic and partner lead attribution.
CREATE TABLE public.traffic_sessions (
  session_id uuid PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL,
  campaign text,
  device text NOT NULL CHECK (device IN ('mobile','desktop','tablet')),
  landing_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX traffic_sessions_created_at_idx ON public.traffic_sessions(created_at DESC);
CREATE INDEX traffic_sessions_profile_created_idx ON public.traffic_sessions(profile_id, created_at);
ALTER TABLE public.traffic_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.traffic_sessions FROM anon, authenticated;
GRANT SELECT ON public.traffic_sessions TO authenticated;
CREATE POLICY admin_traffic_sessions ON public.traffic_sessions FOR SELECT TO authenticated USING (public.is_platform_admin());

CREATE FUNCTION public.record_traffic_session(
  p_session_id uuid, p_source text, p_campaign text, p_device text, p_landing_path text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_session_id IS NULL OR p_source IS NULL OR length(p_source) NOT BETWEEN 1 AND 80
    OR p_campaign IS NOT NULL AND length(p_campaign)>100
    OR p_device NOT IN ('mobile','desktop','tablet')
    OR p_landing_path IS NULL OR length(p_landing_path) NOT BETWEEN 1 AND 160
    OR left(p_landing_path,1)<>'/' OR left(p_landing_path,2)='//'
  THEN RAISE EXCEPTION 'Invalid traffic session'; END IF;

  INSERT INTO public.traffic_sessions(session_id,profile_id,source,campaign,device,landing_path)
  VALUES (p_session_id,auth.uid(),p_source,p_campaign,p_device,p_landing_path)
  ON CONFLICT (session_id) DO UPDATE SET
    profile_id=coalesce(public.traffic_sessions.profile_id,auth.uid()),
    last_seen_at=now();
END;$$;
REVOKE ALL ON FUNCTION public.record_traffic_session(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_traffic_session(uuid,text,text,text,text) TO anon,authenticated;

CREATE FUNCTION public.admin_traffic_summary(period_days integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Administrator required'; END IF;
  IF period_days NOT IN (7,30,90) THEN RAISE EXCEPTION 'Invalid period'; END IF;

  WITH scoped AS (
    SELECT source,device,created_at FROM public.traffic_sessions
    WHERE created_at >= now()-make_interval(days=>period_days)
  ), leads AS (
    SELECT coalesce(first_visit.source,'Não atribuída') AS source
    FROM public.partner_applications application
    LEFT JOIN LATERAL (
      SELECT visit.source FROM public.traffic_sessions visit
      WHERE visit.profile_id=application.submitted_by AND visit.created_at<=application.created_at
      ORDER BY visit.created_at LIMIT 1
    ) first_visit ON true
    WHERE application.created_at >= now()-make_interval(days=>period_days)
  )
  SELECT jsonb_build_object(
    'sessions',(SELECT count(*) FROM scoped),
    'devices',(SELECT jsonb_build_object(
      'mobile',count(*) FILTER (WHERE device='mobile'),
      'desktop',count(*) FILTER (WHERE device='desktop'),
      'tablet',count(*) FILTER (WHERE device='tablet')) FROM scoped),
    'sources',(SELECT coalesce(jsonb_agg(to_jsonb(item)),'[]'::jsonb) FROM (
      SELECT source,count(*)::integer AS count FROM scoped GROUP BY source ORDER BY count DESC,source LIMIT 8
    ) item),
    'trend',(SELECT coalesce(jsonb_agg(to_jsonb(item) ORDER BY item.day),'[]'::jsonb) FROM (
      SELECT (created_at AT TIME ZONE 'Africa/Maputo')::date AS day,count(*)::integer AS count
      FROM scoped GROUP BY 1 ORDER BY 1
    ) item),
    'lead_sources',(SELECT coalesce(jsonb_agg(to_jsonb(item)),'[]'::jsonb) FROM (
      SELECT source,count(*)::integer AS count FROM leads GROUP BY source ORDER BY count DESC,source LIMIT 8
    ) item)
  ) INTO result;
  RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.admin_traffic_summary(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_traffic_summary(integer) TO authenticated;
