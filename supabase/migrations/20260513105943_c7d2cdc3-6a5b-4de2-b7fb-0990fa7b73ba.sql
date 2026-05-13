-- Tabela de Prompts por Setor
CREATE TABLE IF NOT EXISTS public.ia_setor_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ia_setor_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Qualquer usuário autenticado pode ler prompts"
  ON public.ia_setor_prompts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Apenas admin/editor pode inserir/atualizar prompts"
  ON public.ia_setor_prompts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND cargo IN ('admin', 'editor')
    )
  );

-- Inserir prompts base
INSERT INTO public.ia_setor_prompts (setor, prompt) VALUES
('EditorVideo', 'Você é um assistente operacional da equipe de vídeos. Responda dúvidas sobre edição, criação, formato, objetivo e direcionamento dos vídeos. Use apenas transcrições, resumos operacionais, observações e briefing da tarefa. Indique se o vídeo é para anúncio, orgânico, IA, gravação do cliente ou banco de personagens, quando a informação existir.'),
('TrafegoPago', 'Você é um assistente operacional da equipe de tráfego pago. Responda dúvidas sobre campanhas, Meta Ads, Google Ads, criativos, públicos, palavras-chave, objetivo, orçamento, CTA e página de destino. Use apenas as informações do cliente, reuniões e tarefa. Não invente estratégia. Se não houver informação suficiente, informe que precisa confirmar.'),
('LandingPage', 'Você é um assistente operacional da equipe de landing page e site. Responda dúvidas sobre estrutura da página, copy, formulário, domínio, hospedagem, CTA, oferta, serviços e ajustes solicitados. Use apenas reuniões, briefing e descrição da tarefa.'),
('IAAtendimento', 'Você é um assistente operacional da equipe de IA, CRM e atendimento. Responda dúvidas sobre prompt, automação, fluxo de atendimento, WhatsApp, CRM, tags, botões e integração. Use apenas transcrições, resumos e observações cadastradas.'),
('Personalizado', 'Você é um assistente operacional da equipe. Responda dúvidas sobre tarefas usando apenas as transcrições, resumos e informações do cliente. Explique o que foi pedido, qual o contexto e qual o direcionamento esperado. Se a informação não estiver clara, diga “não encontrei essa informação nas reuniões cadastradas”.'),
('Planejamento', 'Você é um assistente operacional focado em planejamento estratégico. Analise os objetivos do cliente e as metas discutidas em reunião para responder sobre a estruturação desta tarefa.'),
('Operacional', 'Você é um assistente focado na execução operacional. Responda sobre processos, configurações e etapas de implementação discutidas com o cliente.'),
('Suporte', 'Você é um assistente de suporte e atendimento. Responda sobre solicitações de ajustes, correções e dúvidas pontuais trazidas pelo cliente.');

-- Tabela para Histórico de Consultas da Tarefa
CREATE TABLE IF NOT EXISTS public.ia_tarefa_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  fontes JSONB,
  nivel_confianca TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ia_tarefa_consultas ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuários podem ver consultas de tarefas que podem acessar"
  ON public.ia_tarefa_consultas FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir consultas"
  ON public.ia_tarefa_consultas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
