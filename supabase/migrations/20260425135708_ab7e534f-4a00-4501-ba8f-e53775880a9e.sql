
-- 1) Nova tabela status_post_options
CREATE TABLE IF NOT EXISTS public.status_post_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#9ca3af',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.status_post_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_read_status_post_options ON public.status_post_options;
CREATE POLICY auth_read_status_post_options ON public.status_post_options
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS admin_status_post_options_insert ON public.status_post_options;
CREATE POLICY admin_status_post_options_insert ON public.status_post_options
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS admin_status_post_options_update ON public.status_post_options;
CREATE POLICY admin_status_post_options_update ON public.status_post_options
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS admin_status_post_options_delete ON public.status_post_options;
CREATE POLICY admin_status_post_options_delete ON public.status_post_options
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.status_post_options (label, cor, ordem)
SELECT v.label, v.cor, v.ordem FROM (VALUES
  ('Criar',    '#9ca3af', 0),
  ('Revisar',  '#8b5cf6', 1),
  ('Agendado', '#3b82f6', 2),
  ('Postado',  '#10b981', 3),
  ('Atrasado', '#ef4444', 4)
) AS v(label, cor, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.status_post_options);

INSERT INTO public.status_options (label, cor, ordem)
SELECT v.label, v.cor, v.ordem FROM (VALUES
  ('Ativo',                 '#10b981', 0),
  ('Pausado',               '#f59e0b', 1),
  ('Próximo da Renovação',  '#3b82f6', 2),
  ('Finalizado',            '#6b7280', 3)
) AS v(label, cor, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.status_options WHERE LOWER(label) = LOWER(v.label));

-- 3) Drop trigger, converte enum->text, recria trigger
DROP TRIGGER IF EXISTS trg_sync_post_status_with_card ON public.cards;

ALTER TABLE public.cards ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.cards ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.cards ALTER COLUMN status SET DEFAULT 'Criar';

ALTER TABLE public.posts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.posts ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.posts ALTER COLUMN status SET DEFAULT 'Criar';

UPDATE public.cards SET status = 'Criar'    WHERE status IN ('ideias','Renovação');
UPDATE public.cards SET status = 'Agendado' WHERE status = 'Agendar';
UPDATE public.posts SET status = 'Criar'    WHERE status IN ('ideias','Renovação');
UPDATE public.posts SET status = 'Agendado' WHERE status = 'Agendar';

-- Recria a função em texto e o trigger
CREATE OR REPLACE FUNCTION public.sync_post_status_with_card()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  if new.status is distinct from old.status then
    update public.posts
       set status = new.status
     where card_id = new.id;
  end if;
  return new;
end;
$function$;

CREATE TRIGGER trg_sync_post_status_with_card
AFTER UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.sync_post_status_with_card();

-- 4) Job automático "Atrasado"
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.marcar_cards_atrasados()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.cards
     SET status = 'Atrasado'
   WHERE status <> 'Postado'
     AND status <> 'Atrasado'
     AND data_agendada IS NOT NULL
     AND data_agendada < now();
$$;

DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'marcar-cards-atrasados';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'marcar-cards-atrasados',
  '0 * * * *',
  $$ SELECT public.marcar_cards_atrasados(); $$
);
