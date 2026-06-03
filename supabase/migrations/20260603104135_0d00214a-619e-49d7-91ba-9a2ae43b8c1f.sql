
-- 1) Remove overly broad anexos storage policies that bypass ownership checks
DROP POLICY IF EXISTS anexos_authenticated_delete ON storage.objects;
DROP POLICY IF EXISTS anexos_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS anexos_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS anexos_authenticated_read ON storage.objects;
DROP POLICY IF EXISTS auth_read_anexos ON storage.objects;
DROP POLICY IF EXISTS auth_upload_anexos ON storage.objects;

-- Keep can_write-scoped policies (anexos_auth_insert/update/delete) and owner-scoped ones.
-- Add a single read policy for authenticated users (internal staff app).
CREATE POLICY anexos_auth_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'anexos');

-- 2) Add DELETE policy on profiles (only admins / super_admins)
CREATE POLICY admins_delete_profile
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3) Broaden profiles SELECT so internal staff can see teammates' names/avatars
DROP POLICY IF EXISTS users_read_own_profile ON public.profiles;
CREATE POLICY authenticated_read_profiles
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
