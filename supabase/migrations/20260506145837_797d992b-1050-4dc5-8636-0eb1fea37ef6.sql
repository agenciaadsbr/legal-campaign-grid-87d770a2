DROP POLICY IF EXISTS auth_read_demandas ON public.demandas;

CREATE POLICY auth_read_demandas
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (true);