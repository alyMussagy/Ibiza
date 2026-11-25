-- Approximate country/city attribution from Vercel request headers. No IP or coordinates stored.
ALTER TABLE public.traffic_sessions
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS city text;

CREATE OR REPLACE FUNCTION public.record_traffic_session(
  p_session_id uuid, p_source text, p_campaign text, p_device text,
  p_landing_path text, p_country_code text, p_region_code text, p_city text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_session_id IS NULL OR p_source IS NULL OR length(p_source) NOT BETWEEN 1 AND 80
    OR p_campaign IS NOT NULL AND length(p_campaign)>100
    OR p_device NOT IN ('mobile','desktop','tablet')
    OR p_landing_path IS NULL OR length(p_landing_path) NOT BETWEEN 1 AND 160
    OR left(p_landing_path,1)<>'/' OR left(p_landing_path,2)='//'
    OR p_country_code IS NOT NULL AND p_country_code !~ '^[A-Z]{2}$'
    OR p_region_code IS NOT NULL AND (p_country_code IS NULL OR p_region_code !~ '^[A-Z0-9]{1,3}$')
    OR p_city IS NOT NULL AND (p_country_code IS NULL OR length(p_city)>80)
  THEN RAISE EXCEPTION 'Invalid traffic session'; END IF;

  INSERT INTO public.traffic_sessions
    (session_id,profile_id,source,campaign,device,landing_path,country_code,region_code,city)
  VALUES
    (p_session_id,auth.uid(),p_source,p_campaign,p_device,p_landing_path,p_country_code,p_region_code,p_city)
  ON CONFLICT (session_id) DO UPDATE SET
    profile_id=coalesce(public.traffic_sessions.profile_id,auth.uid()),
    country_code=coalesce(public.traffic_sessions.country_code,excluded.country_code),
    region_code=coalesce(public.traffic_sessions.region_code,excluded.region_code),
    city=coalesce(public.traffic_sessions.city,excluded.city),
    last_seen_at=now();
END;$$;
REVOKE ALL ON FUNCTION public.record_traffic_session(uuid,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_traffic_session(uuid,text,text,text,text,text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_traffic_summary(period_days integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Administrator required'; END IF;
  IF period_days NOT IN (7,30,90) THEN RAISE EXCEPTION 'Invalid period'; END IF;

  WITH scoped AS (
    SELECT source,device,created_at,country_code,region_code,city FROM public.traffic_sessions
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
    'locations',(SELECT coalesce(jsonb_agg(to_jsonb(item)),'[]'::jsonb) FROM (
      SELECT country_code AS country,region_code AS region,city,count(*)::integer AS count
      FROM scoped GROUP BY country_code,region_code,city ORDER BY count DESC,country_code,city LIMIT 10
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
