-- 1) Novas colunas em clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS status_cliente text NOT NULL DEFAULT 'Onboarding',
  ADD COLUMN IF NOT EXISTS data_inicio_onboarding timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS prazo_onboarding date,
  ADD COLUMN IF NOT EXISTS data_ativacao timestamptz;

-- Backfill: clientes pré-existentes não devem virar onboarding retroativo
UPDATE public.clientes
   SET status_cliente = 'Ativo',
       data_ativacao = COALESCE(data_ativacao, created_at)
 WHERE status_cliente = 'Onboarding'
   AND created_at < now() - interval '1 minute';

-- Constraint dos valores aceitos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_status_cliente_check'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_status_cliente_check
      CHECK (status_cliente IN ('Onboarding','Ativo','Pausado','Encerrado'));
  END IF;
END $$;

-- 2) Tabelas de configuração de Demandas
CREATE TABLE IF NOT EXISTS public.demanda_categorias_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#6366f1',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demanda_prioridades_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#f59e0b',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demanda_status_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#10b981',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  protegido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed protegido (status essenciais)
INSERT INTO public.demanda_status_custom (label, cor, ordem, protegido) VALUES
  ('Planejamento', '#94a3b8', 0, true),
  ('Criar',        '#3b82f6', 1, true),
  ('Revisar',      '#f59e0b', 2, true),
  ('Entregue',     '#06b6d4', 3, true),
  ('Concluido',    '#10b981', 4, true),
  ('Atrasado',     '#ef4444', 5, true)
ON CONFLICT (label) DO NOTHING;

-- Seed inicial de categorias (alinhadas ao enum atual)
INSERT INTO public.demanda_categorias_custom (label, cor, ordem) VALUES
  ('Designer',       '#ec4899', 0),
  ('EditorVideo',    '#8b5cf6', 1),
  ('LandingPage',    '#06b6d4', 2),
  ('TrafegoPago',    '#f59e0b', 3),
  ('Tecnologia',     '#10b981', 4),
  ('Suporte',        '#6366f1', 5),
  ('Personalizado',  '#94a3b8', 6)
ON CONFLICT (label) DO NOTHING;

-- Seed inicial de prioridades
INSERT INTO public.demanda_prioridades_custom (label, cor, ordem) VALUES
  ('Baixa',   '#94a3b8', 0),
  ('Media',   '#f59e0b', 1),
  ('Alta',    '#f97316', 2),
  ('Urgente', '#ef4444', 3)
ON CONFLICT (label) DO NOTHING;

-- 3) RLS
ALTER TABLE public.demanda_categorias_custom  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_prioridades_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demanda_status_custom      ENABLE ROW LEVEL SECURITY;

-- Categorias
CREATE POLICY auth_read_demanda_categorias_custom
  ON public.demanda_categorias_custom FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_insert_demanda_categorias_custom
  ON public.demanda_categorias_custom FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_update_demanda_categorias_custom
  ON public.demanda_categorias_custom FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_delete_demanda_categorias_custom
  ON public.demanda_categorias_custom FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Prioridades
CREATE POLICY auth_read_demanda_prioridades_custom
  ON public.demanda_prioridades_custom FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_insert_demanda_prioridades_custom
  ON public.demanda_prioridades_custom FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_update_demanda_prioridades_custom
  ON public.demanda_prioridades_custom FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_delete_demanda_prioridades_custom
  ON public.demanda_prioridades_custom FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Status (protegidos não podem ser alterados/excluídos)
CREATE POLICY auth_read_demanda_status_custom
  ON public.demanda_status_custom FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_insert_demanda_status_custom
  ON public.demanda_status_custom FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_update_demanda_status_custom
  ON public.demanda_status_custom FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND protegido = false)
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND protegido = false);
CREATE POLICY admin_delete_demanda_status_custom
  ON public.demanda_status_custom FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND protegido = false);