
-- 1. Colunas em demandas
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS approval_waiting_since timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approval_waiting_by uuid NULL,
  ADD COLUMN IF NOT EXISTS approval_previous_status text NULL;

-- 2. Colunas em cards
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS approval_waiting_since timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approval_waiting_by uuid NULL,
  ADD COLUMN IF NOT EXISTS approval_previous_status text NULL;

-- 3. Função genérica para rastrear entrada/saída do status Revisar em DEMANDAS
CREATE OR REPLACE FUNCTION public.track_approval_status_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias int;
BEGIN
  IF NEW.status::text = 'Revisar' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.approval_waiting_since := now();
    NEW.approval_waiting_by := auth.uid();
    NEW.approval_previous_status := OLD.status::text;
    BEGIN
      INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES (NEW.cliente_id, 'demanda', 'aprovacao_entrou', NEW.id, auth.uid(),
              'Tarefa movida para Aguardando aprovação do cliente.',
              jsonb_build_object('titulo', NEW.titulo, 'de', OLD.status));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSIF OLD.status::text = 'Revisar' AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF OLD.approval_waiting_since IS NOT NULL THEN
      v_dias := GREATEST(0, floor(EXTRACT(EPOCH FROM (now() - OLD.approval_waiting_since)) / 86400)::int);
    ELSE
      v_dias := 0;
    END IF;
    BEGIN
      INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES (NEW.cliente_id, 'demanda', 'aprovacao_saiu', NEW.id, auth.uid(),
              'Tarefa saiu de Aguardando aprovação do cliente após ' || v_dias || ' dia(s).',
              jsonb_build_object('titulo', NEW.titulo, 'para', NEW.status, 'dias', v_dias));
    EXCEPTION WHEN OTHERS THEN NULL; END;
    NEW.approval_waiting_since := NULL;
    NEW.approval_waiting_by := NULL;
    NEW.approval_previous_status := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_approval_demanda ON public.demandas;
CREATE TRIGGER trg_track_approval_demanda
  BEFORE UPDATE OF status ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.track_approval_status_demanda();

-- 4. Função análoga para CARDS
CREATE OR REPLACE FUNCTION public.track_approval_status_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias int;
BEGIN
  IF NEW.status = 'Revisar' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.approval_waiting_since := now();
    NEW.approval_waiting_by := auth.uid();
    NEW.approval_previous_status := OLD.status;
    BEGIN
      INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES (NEW.cliente_id, 'post', 'aprovacao_entrou', NEW.id, auth.uid(),
              'Tarefa movida para Aguardando aprovação do cliente.',
              jsonb_build_object('titulo', NEW.titulo, 'de', OLD.status));
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSIF OLD.status = 'Revisar' AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF OLD.approval_waiting_since IS NOT NULL THEN
      v_dias := GREATEST(0, floor(EXTRACT(EPOCH FROM (now() - OLD.approval_waiting_since)) / 86400)::int);
    ELSE
      v_dias := 0;
    END IF;
    BEGIN
      INSERT INTO public.atividade_cliente (cliente_id, tipo, acao, referencia_id, usuario_id, descricao, payload)
      VALUES (NEW.cliente_id, 'post', 'aprovacao_saiu', NEW.id, auth.uid(),
              'Tarefa saiu de Aguardando aprovação do cliente após ' || v_dias || ' dia(s).',
              jsonb_build_object('titulo', NEW.titulo, 'para', NEW.status, 'dias', v_dias));
    EXCEPTION WHEN OTHERS THEN NULL; END;
    NEW.approval_waiting_since := NULL;
    NEW.approval_waiting_by := NULL;
    NEW.approval_previous_status := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_approval_card ON public.cards;
CREATE TRIGGER trg_track_approval_card
  BEFORE UPDATE OF status ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.track_approval_status_card();

-- 5. Backfill demandas
UPDATE public.demandas d
   SET approval_waiting_since = COALESCE(
     (SELECT MAX(h.created_at) FROM public.historico_demandas h
       WHERE h.demanda_id = d.id AND h.para_status::text = 'Revisar'),
     d.updated_at
   )
 WHERE d.status::text = 'Revisar'
   AND d.approval_waiting_since IS NULL;

-- 6. Backfill cards
UPDATE public.cards
   SET approval_waiting_since = updated_at
 WHERE status = 'Revisar'
   AND approval_waiting_since IS NULL;
