ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS delegada_em timestamptz,
  ADD COLUMN IF NOT EXISTS delegada_por uuid,
  ADD COLUMN IF NOT EXISTS qtd_tarefas_delegadas integer;