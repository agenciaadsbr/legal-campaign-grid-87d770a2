-- Atualizar políticas da tabela profiles
DROP POLICY IF EXISTS "admins_insert_profile" ON public.profiles;
CREATE POLICY "admins_insert_profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Atualizar políticas da tabela responsabilidades_equipe
DROP POLICY IF EXISTS "admin_responsabilidades_equipe_delete" ON public.responsabilidades_equipe;
CREATE POLICY "admin_responsabilidades_equipe_delete" 
ON public.responsabilidades_equipe 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "admin_responsabilidades_equipe_insert" ON public.responsabilidades_equipe;
CREATE POLICY "admin_responsabilidades_equipe_insert" 
ON public.responsabilidades_equipe 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "admin_responsabilidades_equipe_update" ON public.responsabilidades_equipe;
CREATE POLICY "admin_responsabilidades_equipe_update" 
ON public.responsabilidades_equipe 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
