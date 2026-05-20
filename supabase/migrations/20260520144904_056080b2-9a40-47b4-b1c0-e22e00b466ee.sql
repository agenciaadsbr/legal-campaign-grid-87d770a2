
-- Novas colunas em demandas para suportar Card Pai multietapa
ALTER TABLE public.demandas
  ADD COLUMN IF NOT EXISTS is_card_pai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_process_id uuid NULL REFERENCES public.demandas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS process_step_order int NULL,
  ADD COLUMN IF NOT EXISTS process_step_type text NULL,
  ADD COLUMN IF NOT EXISTS process_step_status text NULL,
  ADD COLUMN IF NOT EXISTS process_depends_on uuid NULL REFERENCES public.demandas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS process_step_config jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_demandas_parent_process ON public.demandas(parent_process_id);
CREATE INDEX IF NOT EXISTS idx_demandas_depends_on ON public.demandas(process_depends_on);

-- Gatilho: ao concluir/entregar uma etapa, liberar próxima(s) etapa(s) dependente(s)
CREATE OR REPLACE FUNCTION public.auto_liberar_proxima_etapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text IN ('Concluido','Entregue')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.demandas
       SET process_step_status = 'pendente'
     WHERE process_depends_on = NEW.id
       AND process_step_status = 'bloqueada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_liberar_proxima_etapa ON public.demandas;
CREATE TRIGGER trg_auto_liberar_proxima_etapa
AFTER UPDATE OF status ON public.demandas
FOR EACH ROW
EXECUTE FUNCTION public.auto_liberar_proxima_etapa();
