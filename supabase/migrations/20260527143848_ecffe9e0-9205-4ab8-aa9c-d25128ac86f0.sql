CREATE OR REPLACE FUNCTION public.auto_marcar_demanda_atrasada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.data_limite IS NOT NULL
     AND (NEW.data_limite AT TIME ZONE 'America/Sao_Paulo')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND NEW.status::text NOT IN ('Concluido','Entregue','Atrasado','Revisar','Aguardando aprovação do cliente','Aguardando ação do cliente','Aguardando etapa interna','Aguardando etapa anterior','Agendado','Postado')
     AND NEW.created_at IS NOT NULL
     AND now() - NEW.created_at >= interval '24 hours'
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = NEW.id AND td.liberado = false
     ) THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_demandas_atrasadas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.demandas d
     SET status = 'Atrasado'
   WHERE d.status::text NOT IN ('Concluido','Entregue','Atrasado','Revisar','Aguardando aprovação do cliente','Aguardando ação do cliente','Aguardando etapa interna','Aguardando etapa anterior','Agendado','Postado')
     AND d.data_limite IS NOT NULL
     AND (d.data_limite AT TIME ZONE 'America/Sao_Paulo')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND d.created_at IS NOT NULL
     AND now() - d.created_at >= interval '24 hours'
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = d.id AND td.liberado = false
     );
$function$;

CREATE OR REPLACE FUNCTION public.auto_marcar_atrasado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.data_agendada IS NOT NULL
     AND (NEW.data_agendada AT TIME ZONE 'America/Sao_Paulo')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND NEW.created_at IS NOT NULL
     AND now() - NEW.created_at >= interval '24 hours'
     AND NEW.status IN ('Criar') THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_cards_atrasados()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  UPDATE public.cards
     SET status = 'Atrasado'
   WHERE status = 'Criar'
     AND data_agendada IS NOT NULL
     AND (data_agendada AT TIME ZONE 'America/Sao_Paulo')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND created_at IS NOT NULL
     AND now() - created_at >= interval '24 hours';
$function$;