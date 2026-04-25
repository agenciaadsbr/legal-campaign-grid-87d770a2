-- 1) Adiciona "Planejamento" como ordem 0 e desloca os demais
UPDATE public.status_post_options SET ordem = ordem + 1;
INSERT INTO public.status_post_options (label, cor, ordem)
VALUES ('Planejamento', '#9ca3af', 0)
ON CONFLICT DO NOTHING;

-- 2) Ajusta cores oficiais
UPDATE public.status_post_options SET cor = '#3b82f6' WHERE label = 'Criar';
UPDATE public.status_post_options SET cor = '#f59e0b' WHERE label = 'Revisar';
UPDATE public.status_post_options SET cor = '#a855f7' WHERE label = 'Agendado';
UPDATE public.status_post_options SET cor = '#10b981' WHERE label = 'Postado';
UPDATE public.status_post_options SET cor = '#ef4444' WHERE label = 'Atrasado';

-- 3) Trigger de atrasado automático
CREATE OR REPLACE FUNCTION public.auto_marcar_atrasado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.data_agendada IS NOT NULL
     AND NEW.data_agendada < now()
     AND NEW.status IN ('Criar', 'Revisar', 'Agendado') THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_auto_atrasado ON public.cards;
CREATE TRIGGER cards_auto_atrasado
BEFORE INSERT OR UPDATE OF data_agendada, status
ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.auto_marcar_atrasado();

-- 4) Atualiza update_client_primary_status para ignorar Planejamento como pendência
CREATE OR REPLACE FUNCTION public.update_client_primary_status(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
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
      WHERE cliente_id = p_client_id AND status = 'Criar'
    ) THEN 'Criar'
    ELSE 'Concluido'
  END INTO v_status;

  UPDATE public.clientes SET primary_status = v_status WHERE id = p_client_id;
END;
$$;

-- Reaplica o status para todos clientes existentes
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clientes LOOP
    PERFORM public.update_client_primary_status(r.id);
  END LOOP;
END $$;