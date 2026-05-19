-- 1. Ensure RLS policies for operational_templates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can view operational templates') THEN
        CREATE POLICY "Anyone authenticated can view operational templates" ON public.operational_templates FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage operational templates') THEN
        CREATE POLICY "Admins can manage operational templates" ON public.operational_templates FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 2. Populate default single templates
INSERT INTO public.operational_templates (nome, categoria, ordem, prioridade, status_inicial, ativo)
VALUES 
('Configuração Google Ads', 'TrafegoPago', 10, 'Media', 'Planejamento', true),
('Configuração Meta Ads', 'TrafegoPago', 20, 'Media', 'Planejamento', true),
('Instalação de Pixel e API de Conversão', 'Operacional', 30, 'Media', 'Planejamento', true),
('Criação de Landing Page', 'LandingPage', 40, 'Media', 'Planejamento', true),
('Configuração CRM / Atendimento IA', 'IAAtendimento', 50, 'Media', 'Planejamento', true)
ON CONFLICT DO NOTHING;

-- 3. Ensure policies for task_dependencies (fixing previous potentially incomplete policies)
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone authenticated can view dependencies" ON public.task_dependencies;
    DROP POLICY IF EXISTS "Anyone authenticated can insert dependencies" ON public.task_dependencies;
    DROP POLICY IF EXISTS "Anyone authenticated can update dependencies" ON public.task_dependencies;
    DROP POLICY IF EXISTS "Anyone authenticated can delete dependencies" ON public.task_dependencies;
    
    CREATE POLICY "Anyone authenticated can view dependencies" ON public.task_dependencies FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "Anyone authenticated can insert dependencies" ON public.task_dependencies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "Anyone authenticated can update dependencies" ON public.task_dependencies FOR UPDATE USING (auth.role() = 'authenticated');
    CREATE POLICY "Anyone authenticated can delete dependencies" ON public.task_dependencies FOR DELETE USING (auth.role() = 'authenticated');
END $$;
