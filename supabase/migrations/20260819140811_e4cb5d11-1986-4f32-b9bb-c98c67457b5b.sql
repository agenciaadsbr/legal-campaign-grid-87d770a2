CREATE OR REPLACE FUNCTION public.auto_marcar_atrasado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Quando o usuário move o card manualmente (mudança explícita de status),
  -- respeitamos a escolha dele e não sobrescrevemos para "Atrasado".
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'Criar'
     AND NEW.data_limite_tarefa IS NOT NULL
     AND NEW.data_limite_tarefa < (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND NEW.created_at IS NOT NULL
     AND now() - NEW.created_at >= interval '24 hours' THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$$;