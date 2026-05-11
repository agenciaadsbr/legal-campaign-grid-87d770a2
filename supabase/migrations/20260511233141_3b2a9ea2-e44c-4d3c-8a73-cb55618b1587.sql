
-- Phase 1: Estrutura Operacional

-- 1. Add 'Operacional' to demanda_categoria enum
ALTER TYPE public.demanda_categoria ADD VALUE IF NOT EXISTS 'Operacional';

-- 2. New columns on demandas
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS marcado_ja_possui boolean NOT NULL DEFAULT false;

-- 3. operational_templates table
CREATE TABLE IF NOT EXISTS public.operational_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'Operacional',
  prioridade public.demanda_prioridade NOT NULL DEFAULT 'Media',
  status_inicial public.demanda_status NOT NULL DEFAULT 'Criar',
  ativo boolean NOT NULL DEFAULT true,
  responsavel_padrao_id uuid,
  permite_dependencia boolean NOT NULL DEFAULT true,
  depends_on_template_id uuid REFERENCES public.operational_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_operational_templates ON public.operational_templates;
CREATE POLICY auth_read_operational_templates ON public.operational_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS admin_insert_operational_templates ON public.operational_templates;
CREATE POLICY admin_insert_operational_templates ON public.operational_templates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS admin_update_operational_templates ON public.operational_templates;
CREATE POLICY admin_update_operational_templates ON public.operational_templates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS admin_delete_operational_templates ON public.operational_templates;
CREATE POLICY admin_delete_operational_templates ON public.operational_templates
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_operational_templates_updated_at ON public.operational_templates;
CREATE TRIGGER trg_operational_templates_updated_at
  BEFORE UPDATE ON public.operational_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
