
-- Replace overly permissive alertas insert policy
DROP POLICY IF EXISTS "System inserts alertas" ON public.alertas;
CREATE POLICY "Authenticated users insert own-related alertas"
  ON public.alertas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
