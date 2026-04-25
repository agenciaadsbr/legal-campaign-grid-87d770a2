-- Converte clientes.status de enum restrito para text livre
ALTER TABLE public.clientes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.clientes ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.clientes ALTER COLUMN status SET DEFAULT 'Ativo';

-- Limpeza: remover status de card que vazaram para status_options
DELETE FROM public.status_options 
WHERE label IN ('CRIAR','REVISAR','AGENDADO','POSTADO','ATRASADO');

-- Reordenar para iniciar do 0
WITH r AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ordem) - 1 AS rn FROM public.status_options
)
UPDATE public.status_options s SET ordem = r.rn FROM r WHERE s.id = r.id;