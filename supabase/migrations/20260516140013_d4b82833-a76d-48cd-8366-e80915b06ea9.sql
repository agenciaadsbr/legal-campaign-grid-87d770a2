-- Add new columns to responsabilidades_equipe table
ALTER TABLE public.responsabilidades_equipe
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS funcao_principal TEXT,
ADD COLUMN IF NOT EXISTS supervisor_padrao_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS setores_areas_texto TEXT,
ADD COLUMN IF NOT EXISTS skills_competencias_texto TEXT,
ADD COLUMN IF NOT EXISTS responsabilidades_fixas TEXT,
ADD COLUMN IF NOT EXISTS tarefas_diarias TEXT,
ADD COLUMN IF NOT EXISTS tarefas_semanais TEXT,
ADD COLUMN IF NOT EXISTS demandas_ia TEXT,
ADD COLUMN IF NOT EXISTS palavras_chave_ia TEXT,
ADD COLUMN IF NOT EXISTS quando_acionar TEXT,
ADD COLUMN IF NOT EXISTS quando_nao_acionar TEXT,
ADD COLUMN IF NOT EXISTS observacoes_ia TEXT,
ADD COLUMN IF NOT EXISTS prioridade_padrao TEXT DEFAULT 'Média',
ADD COLUMN IF NOT EXISTS regras_prioridade TEXT,
ADD COLUMN IF NOT EXISTS prazo_padrao_sugerido TEXT,
ADD COLUMN IF NOT EXISTS ferramentas_utilizadas TEXT,
ADD COLUMN IF NOT EXISTS entregaveis_esperados TEXT,
ADD COLUMN IF NOT EXISTS checklist_padrao TEXT,
ADD COLUMN IF NOT EXISTS tipos_participacao TEXT[], -- array of strings for multi-select
ADD COLUMN IF NOT EXISTS setores_compativeis TEXT[], -- array of strings for multi-select
ADD COLUMN IF NOT EXISTS regras_atribuicao JSONB DEFAULT '{
  "executor_padrao": true,
  "pode_ser_supervisor": false,
  "pode_ser_apoio": true,
  "recebe_urgentes": true,
  "recebe_reuniao": true,
  "recebe_whatsapp": true,
  "recebe_internas": true,
  "recebe_clientes": true
}'::jsonb;

-- Comment on columns for better documentation
COMMENT ON COLUMN public.responsabilidades_equipe.tipos_participacao IS 'Executor principal, Apoio técnico, Supervisor, Validador, etc.';
COMMENT ON COLUMN public.responsabilidades_equipe.setores_compativeis IS 'Tráfego, Design, Vídeo, Web, etc.';
COMMENT ON COLUMN public.responsabilidades_equipe.regras_atribuicao IS 'Configurações de atribuição automática da IA';
