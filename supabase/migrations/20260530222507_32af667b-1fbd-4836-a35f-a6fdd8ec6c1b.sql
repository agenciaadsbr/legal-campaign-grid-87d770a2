
-- Singleton table for activation rules (Central de Ativação)
CREATE TABLE IF NOT EXISTS public.ativacao_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requer_meta_ads boolean NOT NULL DEFAULT true,
  requer_google_ads boolean NOT NULL DEFAULT true,
  requer_posts boolean NOT NULL DEFAULT true,
  requer_crm boolean NOT NULL DEFAULT false,
  requer_lp boolean NOT NULL DEFAULT false,
  requer_gmn boolean NOT NULL DEFAULT false,
  requer_reuniao_performance boolean NOT NULL DEFAULT false,
  requer_checklist boolean NOT NULL DEFAULT true,
  modo_regra text NOT NULL DEFAULT 'todas' CHECK (modo_regra IN ('todas','minimo')),
  quantidade_minima integer NOT NULL DEFAULT 4,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.ativacao_regras TO authenticated;
GRANT ALL ON public.ativacao_regras TO service_role;

ALTER TABLE public.ativacao_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_ativacao_regras ON public.ativacao_regras
  FOR SELECT TO authenticated USING (true);

CREATE POLICY admin_write_ativacao_regras_insert ON public.ativacao_regras
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY admin_write_ativacao_regras_update ON public.ativacao_regras
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY admin_delete_ativacao_regras ON public.ativacao_regras
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- Seed the singleton row
INSERT INTO public.ativacao_regras (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.ativacao_regras);
