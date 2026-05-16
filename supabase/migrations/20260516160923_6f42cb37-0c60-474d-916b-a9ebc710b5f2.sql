-- Adicionar colunas em tarefas_sugeridas
ALTER TABLE public.tarefas_sugeridas 
ADD COLUMN IF NOT EXISTS supervisor_sugerido_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS apoio TEXT,
ADD COLUMN IF NOT EXISTS checklist TEXT,
ADD COLUMN IF NOT EXISTS entregavel_esperado TEXT,
ADD COLUMN IF NOT EXISTS justificativa_atribuicao TEXT;

-- Adicionar colunas em demandas
ALTER TABLE public.demandas 
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS apoio TEXT,
ADD COLUMN IF NOT EXISTS checklist TEXT,
ADD COLUMN IF NOT EXISTS entregavel_esperado TEXT,
ADD COLUMN IF NOT EXISTS justificativa_atribuicao TEXT;
