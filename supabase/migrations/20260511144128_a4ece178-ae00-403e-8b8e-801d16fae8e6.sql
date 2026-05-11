
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS data_contratacao date,
  ADD COLUMN IF NOT EXISTS status_relacionamento text,
  ADD COLUMN IF NOT EXISTS status_performance text,
  ADD COLUMN IF NOT EXISTS link_relatorio text;
