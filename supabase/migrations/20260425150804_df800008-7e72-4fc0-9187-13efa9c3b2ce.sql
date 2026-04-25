
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS primary_status text NOT NULL DEFAULT 'Criar';

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
    WHEN EXISTS (SELECT 1 FROM public.cards WHERE cliente_id = p_client_id AND status = 'Atrasado') THEN 'Atrasado'
    WHEN EXISTS (SELECT 1 FROM public.cards WHERE cliente_id = p_client_id AND status = 'Revisar')  THEN 'Revisar'
    WHEN EXISTS (SELECT 1 FROM public.cards WHERE cliente_id = p_client_id AND status = 'Criar')    THEN 'Criar'
    WHEN EXISTS (SELECT 1 FROM public.cards WHERE cliente_id = p_client_id AND status = 'Agendado') THEN 'Agendado'
    WHEN EXISTS (SELECT 1 FROM public.cards WHERE cliente_id = p_client_id) THEN 'Postado'
    ELSE 'Criar'
  END INTO v_status;

  UPDATE public.clientes SET primary_status = v_status WHERE id = p_client_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_client_primary_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_client_primary_status(OLD.cliente_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_client_primary_status(NEW.cliente_id);
    IF TG_OP = 'UPDATE' AND OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      PERFORM public.update_client_primary_status(OLD.cliente_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS cards_primary_status_ins ON public.cards;
DROP TRIGGER IF EXISTS cards_primary_status_upd ON public.cards;
DROP TRIGGER IF EXISTS cards_primary_status_del ON public.cards;

CREATE TRIGGER cards_primary_status_ins
  AFTER INSERT ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_client_primary_status();

CREATE TRIGGER cards_primary_status_upd
  AFTER UPDATE OF status, cliente_id ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_client_primary_status();

CREATE TRIGGER cards_primary_status_del
  AFTER DELETE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_client_primary_status();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clientes LOOP
    PERFORM public.update_client_primary_status(r.id);
  END LOOP;
END $$;
