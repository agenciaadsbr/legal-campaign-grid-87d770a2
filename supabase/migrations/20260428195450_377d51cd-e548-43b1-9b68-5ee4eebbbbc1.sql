
ALTER TYPE public.demanda_categoria ADD VALUE IF NOT EXISTS 'IAAtendimento';
ALTER TYPE public.demanda_categoria ADD VALUE IF NOT EXISTS 'Briefing';
ALTER TYPE public.demanda_categoria ADD VALUE IF NOT EXISTS 'Planejamento';

CREATE TABLE IF NOT EXISTS public.cliente_documentacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'outro',
  titulo text NOT NULL,
  url text,
  login text,
  senha text,
  observacao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_documentacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_cliente_documentacao ON public.cliente_documentacao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY rw_cliente_documentacao_insert ON public.cliente_documentacao
  FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY rw_cliente_documentacao_update ON public.cliente_documentacao
  FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY admin_cliente_documentacao_delete ON public.cliente_documentacao
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_updated_at_cliente_documentacao ON public.cliente_documentacao;
CREATE TRIGGER set_updated_at_cliente_documentacao
  BEFORE UPDATE ON public.cliente_documentacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cliente_documentacao_cliente ON public.cliente_documentacao(cliente_id);
