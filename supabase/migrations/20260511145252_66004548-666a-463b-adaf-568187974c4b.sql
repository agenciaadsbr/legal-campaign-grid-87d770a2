
-- ============ FASE 3: REUNIÕES ============
CREATE TABLE IF NOT EXISTS public.reunioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  titulo text NOT NULL,
  data timestamptz NOT NULL DEFAULT now(),
  tipo text,
  link_tldv text,
  transcricao text,
  observacoes text,
  responsavel_id uuid,
  resumo_cliente text,
  resumo_tarefas text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_reunioes ON public.reunioes FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_reunioes_insert ON public.reunioes FOR INSERT TO authenticated WITH CHECK (can_write(auth.uid()));
CREATE POLICY rw_reunioes_update ON public.reunioes FOR UPDATE TO authenticated USING (can_write(auth.uid())) WITH CHECK (can_write(auth.uid()));
CREATE POLICY admin_reunioes_delete ON public.reunioes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS reunioes_set_updated_at ON public.reunioes;
CREATE TRIGGER reunioes_set_updated_at BEFORE UPDATE ON public.reunioes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_reunioes_cliente ON public.reunioes(cliente_id, data DESC);

-- ============ FASE 5: TAREFAS SUGERIDAS ============
CREATE TABLE IF NOT EXISTS public.tarefas_sugeridas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  reuniao_id uuid,
  titulo text NOT NULL,
  descricao text,
  categoria text,
  responsavel_sugerido_id uuid,
  prioridade text DEFAULT 'Media',
  prazo_sugerido date,
  origem text NOT NULL DEFAULT 'reuniao',
  status text NOT NULL DEFAULT 'aguardando_aprovacao',
  demanda_id uuid,
  criado_por uuid,
  aprovado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tarefas_sugeridas ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_tarefas_sugeridas ON public.tarefas_sugeridas FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_tarefas_sugeridas_insert ON public.tarefas_sugeridas FOR INSERT TO authenticated WITH CHECK (can_write(auth.uid()));
CREATE POLICY admin_tarefas_sugeridas_update ON public.tarefas_sugeridas FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_tarefas_sugeridas_delete ON public.tarefas_sugeridas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS tarefas_sugeridas_set_updated_at ON public.tarefas_sugeridas;
CREATE TRIGGER tarefas_sugeridas_set_updated_at BEFORE UPDATE ON public.tarefas_sugeridas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tarefas_sugeridas_cliente ON public.tarefas_sugeridas(cliente_id, status);

-- Rastreabilidade nas demandas
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS origem_reuniao_id uuid,
  ADD COLUMN IF NOT EXISTS origem_sugestao_id uuid;

-- ============ FASE 7: RESPONSABILIDADES DA EQUIPE ============
CREATE TABLE IF NOT EXISTS public.responsabilidades_equipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  cargo text,
  areas text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  setores text[] NOT NULL DEFAULT '{}',
  responsabilidades text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.responsabilidades_equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_responsabilidades_equipe ON public.responsabilidades_equipe FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_responsabilidades_equipe_insert ON public.responsabilidades_equipe FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_responsabilidades_equipe_update ON public.responsabilidades_equipe FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_responsabilidades_equipe_delete ON public.responsabilidades_equipe FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS responsabilidades_equipe_set_updated_at ON public.responsabilidades_equipe;
CREATE TRIGGER responsabilidades_equipe_set_updated_at BEFORE UPDATE ON public.responsabilidades_equipe FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FASE 8: ESTRUTURA DE IA ============
CREATE TABLE IF NOT EXISTS public.ia_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text,
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_read_ia_config ON public.ia_config FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_ia_config_insert ON public.ia_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_config_update ON public.ia_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_config_delete ON public.ia_config FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS ia_config_set_updated_at ON public.ia_config;
CREATE TRIGGER ia_config_set_updated_at BEFORE UPDATE ON public.ia_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ia_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ia_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_read_ia_prompts ON public.ia_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_ia_prompts_insert ON public.ia_prompts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_prompts_update ON public.ia_prompts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_prompts_delete ON public.ia_prompts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP TRIGGER IF EXISTS ia_prompts_set_updated_at ON public.ia_prompts;
CREATE TRIGGER ia_prompts_set_updated_at BEFORE UPDATE ON public.ia_prompts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ia_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  modelo text,
  tokens_input integer,
  tokens_output integer,
  custo numeric,
  input_resumo text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ia_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read_ia_logs ON public.ia_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_logs_insert ON public.ia_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_logs_delete ON public.ia_logs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
