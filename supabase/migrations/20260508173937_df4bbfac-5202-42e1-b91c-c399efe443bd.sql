DROP POLICY IF EXISTS admin_anexos_demandas_delete ON public.anexos_demandas;

CREATE POLICY rw_anexos_demandas_delete
ON public.anexos_demandas
FOR DELETE
TO authenticated
USING (public.can_write(auth.uid()));