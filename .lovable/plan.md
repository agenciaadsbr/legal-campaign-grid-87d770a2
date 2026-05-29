## Objetivo
Quando o usuário clicar em "Ver resumo da reunião" (na seção "Está com dúvidas na tarefa? Consulte aqui"), o sistema registra a visualização automaticamente — sem checkbox, sem botão extra de confirmação — e exibe estado visual com nome, data e hora.

## Escopo
- Componente único responsável pelo botão: `src/components/demandas/TarefaIAConsulta.tsx` (já é usado em todas as abas: Posts, Vídeos, Tráfego, LP/Site, IA/Atendimento, Operacional, Urgências, Card Pai, etapas filhas, Central de Tarefas via dialogs de demanda).
- Nova tabela `task_meeting_summary_views` para persistência.
- Novo store `useResumoViews` para consultar/registrar e expor mapa por demanda.
- Indicador discreto no `TarefaIAConsulta` antes/depois do clique.
- Propagação herdada Card Pai → etapas filhas (mesmo `meeting_id` ou `parent_process_id`).
- Ação em massa em Posts (`PostsKanbanCliente`): novo botão "Ver resumo da reunião" para seleção múltipla.
- Badge discreto na Central de Tarefas (`MinhasTarefasTabela`) por linha — "Visualizado" / "Não visualizado".
- Evento no histórico rápido (`HistoricoRapido`) quando houver visualização.

## Etapas

1. **Migração SQL** (`task_meeting_summary_views`):
   - Campos: `id`, `demanda_id` (uuid, NOT NULL), `meeting_id` (uuid, nullable), `user_id` (uuid, NOT NULL), `first_viewed_at` (timestamptz, default now()), `last_viewed_at` (timestamptz, default now()), `view_count` (int default 1), `created_at`, `updated_at`.
   - Unique `(demanda_id, user_id)` para upsert idempotente.
   - GRANTs + RLS: usuários autenticados podem ler todas as visualizações (transparência operacional) e inserir/atualizar apenas as próprias.
   - Índices em `demanda_id`, `meeting_id`.

2. **Store** `src/store/resumoViews.ts`:
   - `views: Record<string, ResumoView[]>` indexado por `demanda_id`.
   - `load(demandaIds: string[])` — busca em lote.
   - `registrar(demandaIds: string[], meetingId?: string)` — upsert (insert + on conflict update `last_viewed_at`, `view_count = view_count + 1`).
   - Helper `getMinhaVisualizacao(demandaId, userId)` e `temVisualizacao(demandaId)`.

3. **TarefaIAConsulta**:
   - Carregar visualizações da demanda atual ao abrir a seção.
   - Acima do botão exibir badge:
     - ⚠️ "Resumo da reunião ainda não visualizado" (não visualizado pelo usuário logado)
     - ✅ "Resumo visualizado — Nome • dd/mm/aaaa às hh:mm" (visualizado)
   - Botão muda label: "Ver resumo da reunião" → "Ver novamente".
   - No `onClick`, depois de abrir o `ReuniaoDialog`, chamar `registrar([demanda.id], reuniao.id)`. Para Card Pai (`is_card_pai`), buscar etapas filhas via `parent_process_id` e registrar para todas.
   - Caso não haja reunião nem resumo: exibir "Esta tarefa não possui resumo de reunião vinculado." e desabilitar botão (não bloquear nada mais).

4. **Card Pai → etapas filhas**:
   - Ao registrar no pai, também registrar para todas as demandas com `parent_process_id = demanda.id`.
   - Nas etapas filhas, se houver visualização vinda do pai (mesmo `meeting_id`), exibir "✅ Resumo visualizado no Card Pai — Nome • data".

5. **PostsKanbanCliente — ação em massa**:
   - No modo seleção (já existente), adicionar botão "Ver resumo da reunião".
   - Abre `ReuniaoDialog` da reunião do cliente e chama `registrar(idsSelecionados, reuniao.id)`. Posts sem reunião são ignorados com toast discreto.
   - Confirmação: "✅ Resumo visualizado para X posts selecionados".

6. **Central de Tarefas (`MinhasTarefasTabela`)**:
   - Badge pequeno por linha: "✅ Visualizado" ou "⚠️ Não visualizado" — apenas se a tarefa tiver reunião vinculada (`origem_reuniao_id`).
   - Carregar `useResumoViews.load` para as demandas listadas.

7. **Histórico**:
   - O store de atividades (`useAtividades`) já registra eventos. Após `registrar`, inserir registro tipo `"visualizacao_resumo"` com texto "[Nome] visualizou o resumo da reunião em [data/hora]". Aparece no `HistoricoRapido` da demanda.

8. **Versionamento**: atualizar `public/version.json` ao final.

## Não-faz
- Não bloqueia mover/concluir/editar tarefa.
- Não altera IA de dúvidas.
- Não cria coluna nova na tabela da Central — usa badge inline.
- Não exige confirmação extra.

## Confirmação
Migração de BD + store + alterações em 4 componentes existentes (`TarefaIAConsulta`, `PostsKanbanCliente`, `MinhasTarefasTabela`) + uso do `useAtividades` para histórico. Aprovar para eu disparar a migração e implementar?