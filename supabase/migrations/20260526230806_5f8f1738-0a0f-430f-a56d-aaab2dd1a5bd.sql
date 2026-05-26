
-- 1) Adicionar novos valores ao enum demanda_status (idempotente)
ALTER TYPE public.demanda_status ADD VALUE IF NOT EXISTS 'Aguardando etapa anterior';
ALTER TYPE public.demanda_status ADD VALUE IF NOT EXISTS 'Aguardando etapa interna';
ALTER TYPE public.demanda_status ADD VALUE IF NOT EXISTS 'Aguardando ação do cliente';
ALTER TYPE public.demanda_status ADD VALUE IF NOT EXISTS 'Aguardando aprovação do cliente';
ALTER TYPE public.demanda_status ADD VALUE IF NOT EXISTS 'Agendado';
ALTER TYPE public.demanda_status ADD VALUE IF NOT EXISTS 'Postado';

-- 2) Nova coluna status_motivo (badge complementar). Não afeta colunas existentes.
ALTER TABLE public.demandas ADD COLUMN IF NOT EXISTS status_motivo text;
