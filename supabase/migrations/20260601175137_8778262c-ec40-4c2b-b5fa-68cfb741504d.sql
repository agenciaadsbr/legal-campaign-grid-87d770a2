ALTER FUNCTION public.trigger_update_client_primary_status() SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.update_client_primary_status(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.trigger_update_client_primary_status() TO authenticated, anon, service_role;