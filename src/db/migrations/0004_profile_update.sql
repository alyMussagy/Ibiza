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
