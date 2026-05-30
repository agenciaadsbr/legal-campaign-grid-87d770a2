-- Adiciona colunas de auditoria ao ia_logs para identificar provider, ação e contexto da chamada
ALTER TABLE public.ia_logs
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS source_module text,
  ADD COLUMN IF NOT EXISTS cliente_id uuid,
  ADD COLUMN IF NOT EXISTS reuniao_id uuid,
  ADD COLUMN IF NOT EXISTS demanda_id uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS latency_ms integer;

-- Backfill provider para registros antigos a partir do modelo
UPDATE public.ia_logs
SET provider = CASE
  WHEN modelo ILIKE 'openai/%' OR modelo ILIKE 'gpt-%' OR modelo ILIKE 'o1%' OR modelo ILIKE 'o3%' OR modelo ILIKE 'o4%' THEN 'gpt'
  WHEN modelo ILIKE 'google/%' OR modelo ILIKE 'gemini%' THEN 'gemini'
  ELSE provider
END
WHERE provider IS NULL;

CREATE INDEX IF NOT EXISTS idx_ia_logs_provider_created ON public.ia_logs (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_logs_created ON public.ia_logs (created_at DESC);