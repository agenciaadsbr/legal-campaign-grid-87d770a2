
-- 1. Tabela card_pai
CREATE TABLE public.card_pai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  status_geral text NOT NULL DEFAULT 'Em andamento',
  responsaveis_ids uuid[] NOT NULL DEFAULT '{}',
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_pai ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_card_pai ON public.card_pai FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_card_pai_insert ON public.card_pai FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY rw_card_pai_update ON public.card_pai FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY admin_card_pai_delete ON public.card_pai FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_card_pai_updated_at
  BEFORE UPDATE ON public.card_pai
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_card_pai_cliente ON public.card_pai(cliente_id);

-- 2. Tabela card_pai_etapas
CREATE TABLE public.card_pai_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_pai_id uuid NOT NULL REFERENCES public.card_pai(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'tarefa_real',
  titulo text NOT NULL,
  categoria_alvo text,
  responsavel_id uuid,
  status_interno_valor text,
  demanda_id uuid,
  depends_on_etapa_id uuid,
  liberado boolean NOT NULL DEFAULT true,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_pai_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_card_pai_etapas ON public.card_pai_etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY rw_card_pai_etapas_insert ON public.card_pai_etapas FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY rw_card_pai_etapas_update ON public.card_pai_etapas FOR UPDATE TO authenticated USING (public.can_write(auth.uid())) WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY admin_card_pai_etapas_delete ON public.card_pai_etapas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_card_pai_etapas_updated_at
  BEFORE UPDATE ON public.card_pai_etapas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_card_pai_etapas_card_pai ON public.card_pai_etapas(card_pai_id);
CREATE INDEX idx_card_pai_etapas_demanda ON public.card_pai_etapas(demanda_id);

-- 3. Coluna card_pai_id em demandas
ALTER TABLE public.demandas ADD COLUMN card_pai_id uuid;
CREATE INDEX idx_demandas_card_pai ON public.demandas(card_pai_id);

-- 4. Trigger: ao concluir demanda vinculada, marcar etapa e liberar próxima
CREATE OR REPLACE FUNCTION public.sync_card_pai_etapa_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_etapa_id uuid;
BEGIN
  IF NEW.card_pai_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status::text IN ('Concluido','Entregue')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    UPDATE public.card_pai_etapas
       SET concluido = true,
           concluido_em = now()
     WHERE demanda_id = NEW.id
       AND concluido = false
    RETURNING id INTO v_etapa_id;

    IF v_etapa_id IS NOT NULL THEN
      UPDATE public.card_pai_etapas
         SET liberado = true
       WHERE depends_on_etapa_id = v_etapa_id
         AND liberado = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_card_pai_etapa_demanda
  AFTER UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.sync_card_pai_etapa_demanda();
