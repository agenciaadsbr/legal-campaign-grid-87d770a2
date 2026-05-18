DROP POLICY IF EXISTS "Apenas admin/editor pode inserir/atualizar prompts" ON public.ia_setor_prompts;
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode ler prompts" ON public.ia_setor_prompts;

CREATE POLICY "auth_read_ia_setor_prompts"
  ON public.ia_setor_prompts FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_ia_setor_prompts_insert"
  ON public.ia_setor_prompts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "admin_ia_setor_prompts_update"
  ON public.ia_setor_prompts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "admin_ia_setor_prompts_delete"
  ON public.ia_setor_prompts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));