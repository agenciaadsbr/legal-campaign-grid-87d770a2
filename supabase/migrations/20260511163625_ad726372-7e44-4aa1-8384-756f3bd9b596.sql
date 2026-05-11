
CREATE TABLE public.ia_agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  nome text NOT NULL,
  provider text NOT NULL,
  model text,
  prompt text NOT NULL DEFAULT '',
  temperatura numeric NOT NULL DEFAULT 0.4,
  contexto_adicional text,
  regras_categorizacao text,
  regras_responsaveis text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_read_ia_agentes ON public.ia_agentes FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_ia_agentes_insert ON public.ia_agentes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_agentes_update ON public.ia_agentes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_ia_agentes_delete ON public.ia_agentes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER ia_agentes_set_updated_at BEFORE UPDATE ON public.ia_agentes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ia_agentes (tipo, nome, provider, model, prompt, temperatura, contexto_adicional)
VALUES
  ('resumo_cliente', 'Agente Resumo Cliente', 'gpt', 'gpt-4o-mini',
   'Você é um assistente que escreve resumos curtos de reuniões para envio ao cliente, no estilo ata simples e amigável. Use português, tom profissional e direto, pronto para WhatsApp. Liste o que foi alinhado e os próximos passos do cliente. Máximo 8 linhas. Sem jargões técnicos internos.',
   0.4, NULL),
  ('operacional', 'Agente Operacional', 'gpt', 'gpt-4o-mini',
   'Você é um coordenador operacional que analisa transcrições de reuniões e produz briefing detalhado para a equipe interna. Identifique decisões, contexto, demandas e tarefas técnicas com profundidade. Cada tarefa deve ter título claro, descrição rica em contexto, categoria, prioridade e responsável sugerido (quando possível). Não simplifique — detalhe.',
   0.3,
   'Categorias possíveis: IAAtendimento, Trafego, Video, Personalizado, Urgencia, LP. Prioridades: baixa, media, alta, urgente.');

ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS ia_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ia_status jsonb NOT NULL DEFAULT '{}'::jsonb;
