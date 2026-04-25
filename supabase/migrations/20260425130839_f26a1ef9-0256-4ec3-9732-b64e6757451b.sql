ALTER TABLE public.status_options ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

-- Inicializa ordem com base em created_at para registros existentes
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS rn
  FROM public.status_options
)
UPDATE public.status_options s
SET ordem = ranked.rn
FROM ranked
WHERE s.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_status_options_ordem ON public.status_options(ordem);