ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS oculto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS oculto_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_clientes_oculto ON public.clientes(oculto) WHERE oculto = true;