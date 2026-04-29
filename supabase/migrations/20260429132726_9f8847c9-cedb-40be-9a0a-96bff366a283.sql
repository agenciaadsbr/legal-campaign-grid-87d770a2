-- =============================================================
-- 1) cliente_documentacao: novas colunas opcionais
-- =============================================================
ALTER TABLE public.cliente_documentacao
  ADD COLUMN IF NOT EXISTS bloco text NOT NULL DEFAULT 'documentos',
  ADD COLUMN IF NOT EXISTS data_evento date,
  ADD COLUMN IF NOT EXISTS enviado_por uuid,
  ADD COLUMN IF NOT EXISTS formato text;

-- Backfill bloco com base no tipo existente
UPDATE public.cliente_documentacao
SET bloco = CASE
  WHEN tipo IN ('acesso','google_ads','meta_business','whatsapp','gmail','google_meu_negocio','facebook','instagram','crm','hospedagem','dominio','wix','wordpress','lovable') THEN 'acessos'
  WHEN tipo IN ('drive','site','lp','planilha') THEN 'links'
  WHEN tipo IN ('reuniao','reuniao_fechamento','reuniao_start','reuniao_briefing','reuniao_alinhamento','reuniao_performance') THEN 'reunioes'
  WHEN tipo IN ('material','boas_vindas','treinamento','script','loom') THEN 'materiais'
  ELSE 'documentos'
END
WHERE bloco = 'documentos';

CREATE INDEX IF NOT EXISTS idx_cliente_documentacao_cliente_bloco
  ON public.cliente_documentacao(cliente_id, bloco);

-- =============================================================
-- 2) cliente_briefing
-- =============================================================
CREATE TABLE IF NOT EXISTS public.cliente_briefing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL UNIQUE,
  blocos jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_briefing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_cliente_briefing ON public.cliente_briefing;
CREATE POLICY auth_read_cliente_briefing
  ON public.cliente_briefing FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS rw_cliente_briefing_insert ON public.cliente_briefing;
CREATE POLICY rw_cliente_briefing_insert
  ON public.cliente_briefing FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS rw_cliente_briefing_update ON public.cliente_briefing;
CREATE POLICY rw_cliente_briefing_update
  ON public.cliente_briefing FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS admin_cliente_briefing_delete ON public.cliente_briefing;
CREATE POLICY admin_cliente_briefing_delete
  ON public.cliente_briefing FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_cliente_briefing_updated_at ON public.cliente_briefing;
CREATE TRIGGER trg_cliente_briefing_updated_at
  BEFORE UPDATE ON public.cliente_briefing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- 3) cliente_planejamento_itens
-- =============================================================
CREATE TABLE IF NOT EXISTS public.cliente_planejamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  bloco text NOT NULL,                  -- 'onboarding' | 'campanhas' | 'conteudo'
  secao text NOT NULL DEFAULT '',       -- 'inicio_projeto' | 'estrategia' | ...
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pendente',     -- pendente | em_andamento | concluido | atrasado
  situacao text NOT NULL DEFAULT 'precisa_criar', -- precisa_criar | ja_possui | nao_aplicavel
  responsavel_id uuid,
  prazo date,
  prioridade text NOT NULL DEFAULT 'media',
  observacao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planejamento_cliente
  ON public.cliente_planejamento_itens(cliente_id, bloco, ordem);

ALTER TABLE public.cliente_planejamento_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_planejamento ON public.cliente_planejamento_itens;
CREATE POLICY auth_read_planejamento
  ON public.cliente_planejamento_itens FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS rw_planejamento_insert ON public.cliente_planejamento_itens;
CREATE POLICY rw_planejamento_insert
  ON public.cliente_planejamento_itens FOR INSERT TO authenticated
  WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS rw_planejamento_update ON public.cliente_planejamento_itens;
CREATE POLICY rw_planejamento_update
  ON public.cliente_planejamento_itens FOR UPDATE TO authenticated
  USING (public.can_write(auth.uid()))
  WITH CHECK (public.can_write(auth.uid()));

DROP POLICY IF EXISTS admin_planejamento_delete ON public.cliente_planejamento_itens;
CREATE POLICY admin_planejamento_delete
  ON public.cliente_planejamento_itens FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_planejamento_updated_at ON public.cliente_planejamento_itens;
CREATE TRIGGER trg_planejamento_updated_at
  BEFORE UPDATE ON public.cliente_planejamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();