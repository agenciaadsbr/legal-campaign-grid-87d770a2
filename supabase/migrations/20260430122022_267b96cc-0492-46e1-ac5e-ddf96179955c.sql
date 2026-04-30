ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS plano text,
  ADD COLUMN IF NOT EXISTS valor_venda numeric,
  ADD COLUMN IF NOT EXISTS nicho_extra text;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS formato text,
  ADD COLUMN IF NOT EXISTS qtd_slides integer;