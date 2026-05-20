-- Guard: impedir INSERT direto com status 'Revisar' (Aguardando aprovação do cliente)
-- A transição só pode ocorrer via UPDATE manual feito pelo usuário.

CREATE OR REPLACE FUNCTION public.prevent_insert_aprovacao_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'Revisar' THEN
    NEW.status := 'Criar'::demanda_status;
    NEW.approval_waiting_since := NULL;
    NEW.approval_waiting_by := NULL;
    NEW.approval_previous_status := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_insert_aprovacao_demanda ON public.demandas;
CREATE TRIGGER trg_prevent_insert_aprovacao_demanda
  BEFORE INSERT ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.prevent_insert_aprovacao_demanda();

CREATE OR REPLACE FUNCTION public.prevent_insert_aprovacao_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Revisar' THEN
    NEW.status := 'Criar';
    NEW.approval_waiting_since := NULL;
    NEW.approval_waiting_by := NULL;
    NEW.approval_previous_status := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_insert_aprovacao_card ON public.cards;
CREATE TRIGGER trg_prevent_insert_aprovacao_card
  BEFORE INSERT ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.prevent_insert_aprovacao_card();