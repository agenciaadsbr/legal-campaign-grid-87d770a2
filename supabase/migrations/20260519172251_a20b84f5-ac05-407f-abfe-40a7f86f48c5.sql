-- Step 1: Enhance demandas table for parent-child relationships
ALTER TABLE public.demandas 
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.demandas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'single'; -- 'single' or 'multi_step'

-- Step 2: Ensure task_dependencies table exists and has correct columns
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
    modo_liberacao TEXT NOT NULL DEFAULT 'automatico', -- 'automatico' or 'manual'
    liberado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(task_id, depends_on_task_id)
);

-- Step 3: Enable RLS and add policies for task_dependencies
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can view dependencies') THEN
        CREATE POLICY "Anyone authenticated can view dependencies" ON public.task_dependencies FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can insert dependencies') THEN
        CREATE POLICY "Anyone authenticated can insert dependencies" ON public.task_dependencies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can update dependencies') THEN
        CREATE POLICY "Anyone authenticated can update dependencies" ON public.task_dependencies FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can delete dependencies') THEN
        CREATE POLICY "Anyone authenticated can delete dependencies" ON public.task_dependencies FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Step 4: Create tables for multi-step templates
CREATE TABLE IF NOT EXISTS public.operational_flow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operational_flow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES public.operational_flow_templates(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    subtipo TEXT,
    responsavel_padrao_id UUID REFERENCES auth.users(id),
    ordem INTEGER DEFAULT 0,
    prioridade TEXT DEFAULT 'Media',
    depends_on_step_id UUID REFERENCES public.operational_flow_steps(id) ON DELETE SET NULL,
    modo_liberacao TEXT DEFAULT 'automatico',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for flow templates
ALTER TABLE public.operational_flow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view flow templates" ON public.operational_flow_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone authenticated can view flow steps" ON public.operational_flow_steps FOR SELECT USING (auth.role() = 'authenticated');

-- Step 5: Insert standard multi-step flows
INSERT INTO public.operational_flow_templates (id, nome, ordem) VALUES
('f0000000-0000-0000-0000-000000000001', 'Ativação Google Ads', 10),
('f0000000-0000-0000-0000-000000000002', 'Ativação Meta Ads', 20),
('f0000000-0000-0000-0000-000000000003', 'Produção de Vídeos para Anúncios', 30),
('f0000000-0000-0000-0000-000000000004', 'Anúncios em Vídeo com IA', 40),
('f0000000-0000-0000-0000-000000000005', 'Produção de Posts', 50),
('f0000000-0000-0000-0000-000000000006', 'Configuração CRM / Agente IA', 60)
ON CONFLICT (id) DO NOTHING;

-- Fluxo Google Ads Steps
DO $$
DECLARE
    flow_id UUID := 'f0000000-0000-0000-0000-000000000001';
    step1_id UUID := gen_random_uuid();
    step2_id UUID := gen_random_uuid();
    step3_id UUID := gen_random_uuid();
    step4_id UUID := gen_random_uuid();
    step5_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem) VALUES
    (step1_id, flow_id, 'Criar Landing Page', 'LandingPage', 1);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step2_id, flow_id, 'Configurar domínio e hospedagem', 'Operacional', 2, step1_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step3_id, flow_id, 'Definir estrutura de campanhas Google', 'TrafegoPago', 3, step2_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step4_id, flow_id, 'Ativar campanha Google Ads', 'TrafegoPago', 4, step3_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step5_id, flow_id, 'Configurar CRM / Agente IA', 'IAAtendimento', 5, step4_id);
END $$;

-- Fluxo Meta Ads Steps
DO $$
DECLARE
    flow_id UUID := 'f0000000-0000-0000-0000-000000000002';
    step1_id UUID := gen_random_uuid();
    step2_id UUID := gen_random_uuid();
    step3_id UUID := gen_random_uuid();
    step4_id UUID := gen_random_uuid();
    step5_id UUID := gen_random_uuid();
    step6_id UUID := gen_random_uuid();
    step7_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem) VALUES
    (step1_id, flow_id, 'Criar Página do Facebook', 'Operacional', 1),
    (step2_id, flow_id, 'Criar Instagram', 'Operacional', 2);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step3_id, flow_id, 'Criar BM / Gerenciador de Anúncios', 'Operacional', 3, step1_id); -- Simplification: depends on one of them
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step4_id, flow_id, 'Configurações técnicas: WhatsApp, Pixel e Pagamento', 'Operacional', 4, step3_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step5_id, flow_id, 'Criar e validar anúncios em imagem', 'Operacional', 5, step4_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step6_id, flow_id, 'Ativar campanhas Meta Ads', 'TrafegoPago', 6, step5_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step7_id, flow_id, 'Configurar CRM / Agente IA', 'IAAtendimento', 7, step6_id);
END $$;

-- Fluxo Produção de Vídeos
DO $$
DECLARE
    flow_id UUID := 'f0000000-0000-0000-0000-000000000003';
    step1_id UUID := gen_random_uuid();
    step2_id UUID := gen_random_uuid();
    step3_id UUID := gen_random_uuid();
    step4_id UUID := gen_random_uuid();
    step5_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem) VALUES
    (step1_id, flow_id, 'Criar roteiros para vídeos gravados', 'EditorVideo', 1);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step2_id, flow_id, 'Aguardar envio dos vídeos pelo cliente', 'Operacional', 2, step1_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step3_id, flow_id, 'Editar vídeos enviados pelo cliente', 'EditorVideo', 3, step2_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step4_id, flow_id, 'Validar vídeos com cliente', 'EditorVideo', 4, step3_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step5_id, flow_id, 'Ativar vídeos no Meta Ads', 'TrafegoPago', 5, step4_id);
END $$;

-- Fluxo Produção de Posts
DO $$
DECLARE
    flow_id UUID := 'f0000000-0000-0000-0000-000000000005';
    step1_id UUID := gen_random_uuid();
    step2_id UUID := gen_random_uuid();
    step3_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem) VALUES
    (step1_id, flow_id, 'Construção dos Posts do Feed', 'Operacional', 1); -- 'Posts' is not a separate cat, usually Operacional or Designer(Personalizado)
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step2_id, flow_id, 'Validação dos posts', 'Operacional', 2, step1_id);
    
    INSERT INTO public.operational_flow_steps (id, flow_id, nome, categoria, ordem, depends_on_step_id) VALUES
    (step3_id, flow_id, 'Agendamento/Postagem dos Posts', 'Operacional', 3, step2_id);
END $$;
