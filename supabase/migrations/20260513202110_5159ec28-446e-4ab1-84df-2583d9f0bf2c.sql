-- Add delegation columns to reunioes table
ALTER TABLE public.reunioes 
ADD COLUMN IF NOT EXISTS gerar_alerta_delegacao BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS responsavel_delegacao_id UUID REFERENCES public.responsaveis(id),
ADD COLUMN IF NOT EXISTS prazo_delegacao DATE,
ADD COLUMN IF NOT EXISTS observacoes_delegacao TEXT;

-- Create table for delegation settings
CREATE TABLE IF NOT EXISTS public.configuracoes_delegacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuarios_autorizados_ids UUID[] DEFAULT '{}',
    prazo_padrao_dias INTEGER DEFAULT 1,
    tipos_sugestao_automatica TEXT[] DEFAULT ARRAY['Performance', 'Estratégia', 'Onboarding', 'Alinhamento'],
    responsavel_padrao_id UUID REFERENCES public.responsaveis(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on delegation settings
ALTER TABLE public.configuracoes_delegacao ENABLE ROW LEVEL SECURITY;

-- Policy for delegation settings
CREATE POLICY "Admin can manage delegation settings" 
ON public.configuracoes_delegacao 
FOR ALL 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "All users can view delegation settings" 
ON public.configuracoes_delegacao 
FOR SELECT 
USING (true);

-- Create table for meeting delegations
CREATE TABLE IF NOT EXISTS public.delegacoes_reuniao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reuniao_id UUID NOT NULL REFERENCES public.reunioes(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id),
    criado_por UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'Aguardando delegação', -- Aguardando delegação, Em análise, Delegado parcialmente, Delegado, Concluído, Cancelado
    prazo DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(reuniao_id)
);

-- Enable RLS on delegations
ALTER TABLE public.delegacoes_reuniao ENABLE ROW LEVEL SECURITY;

-- Policy for delegations
CREATE POLICY "Users can view all delegations" 
ON public.delegacoes_reuniao 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage delegations" 
ON public.delegacoes_reuniao 
FOR ALL 
USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configuracoes_delegacao_updated_at
    BEFORE UPDATE ON public.configuracoes_delegacao
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_delegacoes_reuniao_updated_at
    BEFORE UPDATE ON public.delegacoes_reuniao
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Seed initial delegation config if not exists
INSERT INTO public.configuracoes_delegacao (prazo_padrao_dias)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_delegacao);

-- Update authorized users based on existing names (Robson, Cristiano, Tales, Erick)
DO $$
DECLARE
    robson_id UUID;
    cristiano_id UUID;
    tales_id UUID;
    erick_id UUID;
BEGIN
    SELECT id INTO robson_id FROM public.responsaveis WHERE nome ILIKE 'ROBSON' LIMIT 1;
    SELECT id INTO cristiano_id FROM public.responsaveis WHERE nome ILIKE 'CRISTIANO' LIMIT 1;
    SELECT id INTO tales_id FROM public.responsaveis WHERE nome ILIKE 'TALES' LIMIT 1;
    SELECT id INTO erick_id FROM public.responsaveis WHERE nome ILIKE 'ERICK%' LIMIT 1;

    UPDATE public.configuracoes_delegacao 
    SET usuarios_autorizados_ids = ARRAY_REMOVE(ARRAY[robson_id, cristiano_id, tales_id, erick_id], NULL);
END $$;
