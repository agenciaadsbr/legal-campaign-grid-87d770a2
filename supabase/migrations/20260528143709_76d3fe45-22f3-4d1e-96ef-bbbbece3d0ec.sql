
-- 1. Adiciona coluna data_postagem aos cards (data real ou prevista da publicação).
--    Mantém data_agendada como "data de agendamento" (semântica atualizada).
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS data_postagem date;

-- 2. Corrige update_client_primary_status: Agendar/Agendado/Postado não devem cair
--    automaticamente em "Concluido" — só Postado com data_postagem<=hoje é concluído.
CREATE OR REPLACE FUNCTION public.update_client_primary_status(p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN;
  END IF;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.cards
      WHERE cliente_id = p_client_id AND status = 'Atrasado'
    ) THEN 'Atrasado'
    WHEN EXISTS (
      SELECT 1 FROM public.cards
      WHERE cliente_id = p_client_id AND status = 'Revisar'
    ) THEN 'Revisar'
    WHEN EXISTS (
      SELECT 1 FROM public.cards
      WHERE cliente_id = p_client_id
        AND status IN ('Criar','Agendar','Agendado')
    ) THEN 'Criar'
    WHEN EXISTS (
      SELECT 1 FROM public.cards
      WHERE cliente_id = p_client_id
        AND status = 'Postado'
        AND (data_postagem IS NULL OR data_postagem > v_hoje)
    ) THEN 'Criar'
    ELSE 'Concluido'
  END INTO v_status;

  UPDATE public.clientes SET primary_status = v_status WHERE id = p_client_id;
END;
$function$;

-- 3. Atualiza auto_marcar_atrasado: usa data_limite_tarefa (prazo da criação) em vez
--    de data_agendada (que agora significa agendamento), e só marca atrasado em "Criar".
CREATE OR REPLACE FUNCTION public.auto_marcar_atrasado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'Criar'
     AND NEW.data_limite_tarefa IS NOT NULL
     AND NEW.data_limite_tarefa < (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND NEW.created_at IS NOT NULL
     AND now() - NEW.created_at >= interval '24 hours' THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Atualiza marcar_cards_atrasados (job) para mesmo critério.
CREATE OR REPLACE FUNCTION public.marcar_cards_atrasados()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.cards
     SET status = 'Atrasado'
   WHERE status = 'Criar'
     AND data_limite_tarefa IS NOT NULL
     AND data_limite_tarefa < (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND created_at IS NOT NULL
     AND now() - created_at >= interval '24 hours';
$function$;

-- 5. Validação: impede marcar como Postado se data_postagem estiver no futuro.
CREATE OR REPLACE FUNCTION public.validar_postado_card()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NEW.status = 'Postado' THEN
    -- Se não tem data_postagem, define hoje automaticamente
    IF NEW.data_postagem IS NULL THEN
      NEW.data_postagem := v_hoje;
    ELSIF NEW.data_postagem > v_hoje THEN
      RAISE EXCEPTION 'Não é possível marcar como Postado: data de postagem (%) é futura.', NEW.data_postagem;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validar_postado_card ON public.cards;
CREATE TRIGGER trg_validar_postado_card
  BEFORE INSERT OR UPDATE OF status, data_postagem ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_postado_card();
