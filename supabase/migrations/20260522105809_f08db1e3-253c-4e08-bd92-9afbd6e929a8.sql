
-- 1) Vincular cadência a uma tarefa unificada (id da UnifiedTask, ex "demanda:uuid" / "posts:..." / "planejamento:uuid")
ALTER TABLE public.cadencias_operacionais
  ADD COLUMN IF NOT EXISTS task_id text;

CREATE INDEX IF NOT EXISTS idx_cadencias_task_id ON public.cadencias_operacionais(task_id);

-- 2) Migrar status legados
UPDATE public.cadencias_operacionais
   SET status = 'aguardando_resposta'
 WHERE status = 'em_andamento';

UPDATE public.cadencias_operacionais
   SET status = 'resolvida'
 WHERE status = 'finalizada';

-- 3) Atualizar títulos das mensagens padrão para novos textos de ação
UPDATE public.cadencia_mensagens SET titulo = 'Dia 1 — Enviou mensagem no grupo'   WHERE etapa = 1;
UPDATE public.cadencia_mensagens SET titulo = 'Dia 2 — Enviou mensagem no privado' WHERE etapa = 2;
UPDATE public.cadencia_mensagens SET titulo = 'Dia 3 — Enviou áudio'               WHERE etapa = 3;
UPDATE public.cadencia_mensagens SET titulo = 'Dia 4 — Fez ligação'                WHERE etapa = 4;
