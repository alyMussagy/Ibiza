-- IBIZA: actualização 0004 sobre a instalação 0000–0003.
BEGIN;
DO $$ BEGIN IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 4 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='39c6f42d37593e28c3a8b102b3da3ab74d41de1f96b7dc189de10d936d70316b') THEN RAISE EXCEPTION 'Unexpected migration state'; END IF; END $$;
CREATE FUNCTION public.update_own_profile(new_display_name text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Confirmed email required';
  END IF;
  IF new_display_name IS NULL OR char_length(trim(new_display_name)) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Invalid display name';
  END IF;
  UPDATE public.profiles SET display_name=trim(new_display_name) WHERE id=actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_own_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text) TO authenticated;

INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES('44ecd3fcd605f7d3370ed01354cad46b224096dd421fffe22fe1c8755fa0606b',1793621161902);
COMMIT;
