-- Drop the existing constraint
ALTER TABLE public.atividade_cliente DROP CONSTRAINT IF EXISTS atividade_cliente_tipo_check;

-- Re-add the constraint with 'Observação' included
-- Also adding other common types just in case for future use
ALTER TABLE public.atividade_cliente ADD CONSTRAINT atividade_cliente_tipo_check 
CHECK (tipo = ANY (ARRAY['post'::text, 'demanda'::text, 'Observação'::text, 'briefing'::text, 'documentacao'::text, 'planejamento'::text, 'reuniao'::text]));
