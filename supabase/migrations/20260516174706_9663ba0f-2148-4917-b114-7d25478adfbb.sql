-- Atualizar a função can_write para incluir super_admin
CREATE OR REPLACE FUNCTION public.can_write(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_role(_user_id, 'admin') 
      or public.has_role(_user_id, 'editor') 
      or public.has_role(_user_id, 'super_admin')
$function$;

-- Garantir que as políticas de DELETE em demandas também incluam super_admin
DROP POLICY IF EXISTS "admin_demandas_delete" ON public.demandas;
CREATE POLICY "admin_demandas_delete"
ON public.demandas
FOR DELETE
TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
);

-- Garantir que super_admin possa deletar comentários (além de admin e o próprio autor)
DROP POLICY IF EXISTS "users_delete_own_coment_demandas" ON public.comentarios_demandas;
CREATE POLICY "users_delete_own_coment_demandas"
ON public.comentarios_demandas
FOR DELETE
TO authenticated
USING (
    (auth.uid() = usuario_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
);

-- Garantir que super_admin possa atualizar comentários
DROP POLICY IF EXISTS "users_update_own_coment_demandas" ON public.comentarios_demandas;
CREATE POLICY "users_update_own_coment_demandas"
ON public.comentarios_demandas
FOR UPDATE
TO authenticated
USING (
    (auth.uid() = usuario_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
    (auth.uid() = usuario_id) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
);

-- Histórico de demandas
DROP POLICY IF EXISTS "admin_hist_demandas_delete" ON public.historico_demandas;
CREATE POLICY "admin_hist_demandas_delete"
ON public.historico_demandas
FOR DELETE
TO authenticated
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
);
