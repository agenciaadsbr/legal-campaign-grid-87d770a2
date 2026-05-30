
-- Fix 1: delegacoes_reuniao — restringir policies ao role authenticated + can_write
DROP POLICY IF EXISTS "Users can manage delegations" ON public.delegacoes_reuniao;
DROP POLICY IF EXISTS "Users can view all delegations" ON public.delegacoes_reuniao;

CREATE POLICY "auth_read_delegacoes_reuniao"
ON public.delegacoes_reuniao
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "rw_delegacoes_reuniao_insert"
ON public.delegacoes_reuniao
FOR INSERT
TO authenticated
WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "rw_delegacoes_reuniao_update"
ON public.delegacoes_reuniao
FOR UPDATE
TO authenticated
USING (public.can_write(auth.uid()))
WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "admin_delegacoes_reuniao_delete"
ON public.delegacoes_reuniao
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: documentos_globais — contém login/senha. Restringir leitura a admin/editor (can_write).
DROP POLICY IF EXISTS "auth_read_documentos_globais" ON public.documentos_globais;

CREATE POLICY "rw_read_documentos_globais"
ON public.documentos_globais
FOR SELECT
TO authenticated
USING (public.can_write(auth.uid()));
