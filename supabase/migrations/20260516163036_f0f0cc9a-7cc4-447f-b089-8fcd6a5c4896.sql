-- Garantir que o RLS está ativado
ALTER TABLE public.ia_prompts ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver (para evitar conflitos)
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.ia_prompts;
DROP POLICY IF EXISTS "Permitir gestão para super admins" ON public.ia_prompts;
DROP POLICY IF EXISTS "Permitir insert para super admins" ON public.ia_prompts;
DROP POLICY IF EXISTS "Permitir update para super admins" ON public.ia_prompts;
DROP POLICY IF EXISTS "Permitir delete para super admins" ON public.ia_prompts;

-- Política de Leitura: Usuários autenticados podem ver os prompts
CREATE POLICY "Permitir leitura para autenticados"
ON public.ia_prompts
FOR SELECT
TO authenticated
USING (true);

-- Política de Inserção: Apenas Super Admins
CREATE POLICY "Permitir insert para super admins"
ON public.ia_prompts
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Política de Atualização: Apenas Super Admins
CREATE POLICY "Permitir update para super admins"
ON public.ia_prompts
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Política de Exclusão: Apenas Super Admins
CREATE POLICY "Permitir delete para super admins"
ON public.ia_prompts
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);
