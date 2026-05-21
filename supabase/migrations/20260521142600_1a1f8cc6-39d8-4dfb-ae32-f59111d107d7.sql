-- 1) Cron / função em lote
CREATE OR REPLACE FUNCTION public.marcar_demandas_atrasadas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.demandas d
     SET status = 'Atrasado'
   WHERE status NOT IN ('Concluido','Entregue','Atrasado','Revisar')
     AND data_limite IS NOT NULL
     AND data_limite < now()
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = d.id AND td.liberado = false
     );
$function$;

-- 2) Trigger BEFORE INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.auto_marcar_demanda_atrasada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Respeita mudança explícita de status feita pelo usuário em UPDATE
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.data_limite IS NOT NULL
     AND NEW.data_limite < now()
     AND NEW.status NOT IN ('Concluido','Entregue','Atrasado','Revisar')
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = NEW.id AND td.liberado = false
     ) THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$function$;