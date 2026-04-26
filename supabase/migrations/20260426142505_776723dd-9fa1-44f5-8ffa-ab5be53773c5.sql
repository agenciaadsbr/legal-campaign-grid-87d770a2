
DROP POLICY IF EXISTS rw_hist_demandas_insert ON public.historico_demandas;
CREATE POLICY rw_hist_demandas_insert ON public.historico_demandas FOR INSERT TO authenticated
WITH CHECK (can_write(auth.uid()));
