ALTER TABLE public.ia_config
  ADD COLUMN IF NOT EXISTS modelos_disponiveis jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ultima_verificacao timestamptz,
  ADD COLUMN IF NOT EXISTS latency_ms integer;