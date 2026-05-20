CREATE OR REPLACE FUNCTION public.auto_marcar_demanda_atrasada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Respeita mudança explícita de status feita pelo usuário em UPDATE
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.data_limite IS NOT NULL
     AND NEW.data_limite < now()
     AND NEW.status NOT IN ('Concluido','Entregue','Atrasado')
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = NEW.id AND td.liberado = false
     ) THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$$;