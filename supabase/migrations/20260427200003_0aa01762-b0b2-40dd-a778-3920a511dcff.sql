-- 1) Add new array column
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS responsaveis_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- 2) Backfill from legacy single column
UPDATE public.demandas
   SET responsaveis_ids = ARRAY[responsavel_id]
 WHERE responsavel_id IS NOT NULL
   AND (responsaveis_ids IS NULL OR array_length(responsaveis_ids, 1) IS NULL);

-- 3) Index for filtering by member
CREATE INDEX IF NOT EXISTS idx_demandas_responsaveis_ids
  ON public.demandas USING GIN (responsaveis_ids);

-- 4) Update history trigger to log array changes
CREATE OR REPLACE FUNCTION public.log_historico_demanda()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_demandas(demanda_id, usuario_id, acao, para_status, payload)
    VALUES (NEW.id, NEW.criado_por, 'criada', NEW.status,
            jsonb_build_object('titulo', NEW.titulo, 'responsaveis_ids', NEW.responsaveis_ids));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.historico_demandas(demanda_id, usuario_id, acao, de_status, para_status, payload)
      VALUES (NEW.id, auth.uid(), 'status_alterado', OLD.status, NEW.status, '{}'::jsonb);
    END IF;
    IF NEW.responsaveis_ids IS DISTINCT FROM OLD.responsaveis_ids THEN
      INSERT INTO public.historico_demandas(demanda_id, usuario_id, acao, payload)
      VALUES (NEW.id, auth.uid(), 'responsaveis_alterados',
              jsonb_build_object('de', OLD.responsaveis_ids, 'para', NEW.responsaveis_ids));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5) Replace SELECT policy to use array membership
DROP POLICY IF EXISTS auth_read_demandas ON public.demandas;
CREATE POLICY auth_read_demandas
  ON public.demandas
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR criado_por = auth.uid()
    OR auth.uid() = ANY (responsaveis_ids)
    OR responsavel_id = auth.uid()  -- compat durante transição
  );