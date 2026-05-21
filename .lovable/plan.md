# Central de Reuniões — Plano (revisado)

Objetivo: nova página `/central-reunioes` que consome a MESMA tabela `public.reunioes` já usada pela aba Reuniões dentro do Projeto Completo. Sem duplicar dados, sem mexer no fluxo atual, apenas adicionando campos de controle pós-reunião e rastreio de tarefas delegadas.

## 1. Migration (aditiva, não destrutiva)

`ALTER TABLE public.reunioes ADD COLUMN IF NOT EXISTS ...`:
- `status TEXT DEFAULT 'agendada'` — agendada | realizada | nao_realizada
- `post_status TEXT NULL` — nao_analisada | em_analise | delegada | sem_acao
- `project_id UUID NULL`
- `motivo_nao_realizada TEXT NULL`
- `analise_iniciada_em TIMESTAMPTZ NULL`
- `analise_iniciada_por UUID NULL`

### Backfill seguro (revisado)

Registros futuros (`data >= now()`): `status = 'agendada'`, `post_status = NULL`.

Registros passados (`data < now()`): `status = 'realizada'` e
- se `link_tldv IS NOT NULL OR transcricao IS NOT NULL OR resumo_cliente IS NOT NULL OR resumo_tarefas IS NOT NULL` → `post_status = 'nao_analisada'`
- caso contrário → `post_status = NULL`

Nunca atribuir `sem_acao` automaticamente — só via ação manual do usuário.

### Nova tabela `meeting_tasks`

`CREATE TABLE IF NOT EXISTS public.meeting_tasks`:
- `id, meeting_id, client_id, project_id NULL, task_id NULL`
- `title NOT NULL, description NULL, assigned_to UUID NULL, due_date DATE NULL`
- `status TEXT DEFAULT 'pendente'`, `created_at, created_by`

### RLS (revisado — espelhar tabelas existentes)

Antes de criar políticas, reutilizar exatamente o padrão já aplicado a `demandas` / `reunioes`:
- SELECT: `to authenticated using (true)` (mesmo `auth_read_*`)
- INSERT/UPDATE: `with check (can_write(auth.uid()))` (função já existe no projeto — confirmado em `db-functions`)
- DELETE: `using (has_role(auth.uid(), 'admin'::app_role))` (mesmo padrão de `admin_demandas_delete`)

Se por algum motivo `can_write` não existir, NÃO inventar política nova — copiar literalmente as policies de `demandas`.

### Triggers

Reaproveitar `log_atividade_*` existente. Adicionar trigger leve que insere em `atividade_cliente` em transições de `status`/`post_status` (criada, realizada, não realizada, em análise, delegada, sem ação).

## 2. Store (`src/store/reunioes.ts`)

Estender `Reuniao` com novos campos. Adicionar ações:
- `marcarRealizada(id)` — valida `link_tldv || transcricao || resumo_cliente || resumo_tarefas`; seta `status='realizada'`, `post_status='nao_analisada'`
- `marcarNaoRealizada(id, motivo?)` — `status='nao_realizada'`, `post_status=null`
- `iniciarAnalise(id)` — `post_status='em_analise'`, registra `analise_iniciada_em/por`
- `marcarSemAcao(id)` — apenas manual, com confirmação no UI; `post_status='sem_acao'`
- `delegarTarefas(id, tarefas[])` — ver seção 3

Novo store `src/store/meetingTasks.ts` para CRUD de `meeting_tasks`.

Helper `nullIfEmpty(uuid)` aplicado em TODOS os campos UUID (`client_id`, `project_id`, `responsavel_id`, `assigned_to`, `meeting_id`, `task_id`) antes de insert/update.

## 3. Delegação de tarefas (revisado)

`DelegarTarefasDialog` — lista dinâmica de tarefas. Cada linha tem:
- título (obrigatório), descrição, responsável, prazo, categoria, prioridade
- **checkbox "Criar também como tarefa real no sistema"** (desmarcado por padrão)

Ao confirmar, para cada tarefa:
1. SEMPRE insere em `meeting_tasks` (rastreabilidade).
2. Se o checkbox estiver marcado: cria também em `public.demandas` com `origem_reuniao_id` (campo já existe), depois atualiza `meeting_tasks.task_id` com o id da demanda gerada.
3. Se desmarcado: fica só em `meeting_tasks`.

Validações:
- bloquear tarefas sem título;
- normalizar UUIDs vazios para `NULL`;
- ao final, setar `reuniao.post_status = 'delegada'` e registrar atividade.

## 4. Página `src/pages/CentralReunioes.tsx`

Rota `/central-reunioes` em `App.tsx` (dentro de `RequireAuth/AppLayout`).

- Header: "Central de Reuniões" + botão "+ Nova Reunião"
- 6 widgets clicáveis (Pendentes de análise destacado, Em análise, Delegadas, Sem ação, Agendadas, Não realizadas)
- Filtros: busca texto, cliente, tipo, status, post_status, responsável, período
- Tabela: Cliente · Tipo · Data · Status · Pós-reunião · Responsável · Gravação · Resumo (badge) · Ações (Abrir / Marcar realizada / Não realizada / Em análise / Delegar / Sem ação — com confirmação)
- Badges de pendência: vermelho se `realizada + nao_analisada > 24h`; amarelo se `em_analise > 24h` sem meeting_tasks

Performance:
- Listagem seleciona apenas colunas leves (sem `transcricao`/`resumo_*` completos — usa `length > 0` como boolean)
- Paginação 50 itens, filtros aplicados via Supabase
- `Promise.race` com timeout 15s; try/catch/finally → `setLoading(false)`; skeleton; toast em erro

## 5. Reaproveitamento do modal `ReuniaoDialog`

- Aceitar `clienteId` opcional → quando ausente, mostra Select de cliente
- Exibir badges de `status` e `post_status` no header
- Botões de ação pós-reunião no rodapé com mesma lógica das ações da tabela
- "Sem ação necessária" sempre via `AlertDialog` de confirmação

## 6. Integração com aba Reuniões do Projeto

`ReunioesTab.tsx` permanece intacto. Apenas adiciona badge discreto de `status`/`post_status` ao lado do título de cada card (read-only). Mesmo store → sincronização automática.

## 7. Menu lateral

Adicionar em `AppSidebar.tsx` (após "Central de Tarefas"):
`{ title: "Central de Reuniões", url: "/central-reunioes", icon: Calendar }`. Nada removido.

## 8. Checklist de validação

1. Reuniões antigas nunca viram `sem_acao` automaticamente.
2. Reuniões antigas com resumo/transcrição/link viram `nao_analisada`.
3. Reuniões antigas sem conteúdo ficam com `post_status = NULL`.
4. `sem_acao` só com ação + confirmação do usuário.
5. Delegar sempre cria `meeting_tasks`.
6. Demanda real só é criada quando o checkbox for marcado.
7. RLS espelha `demandas`/`reunioes` — sem bloquear usuários autorizados.
8. Nenhuma reunião duplicada (mesma tabela canônica).
9. Resumos/transcrições/links/observações antigos preservados.
10. Aba Reuniões do Projeto continua funcionando.

## Arquivos

**Criados**
- `src/pages/CentralReunioes.tsx`
- `src/components/reunioes/CentralReunioesWidgets.tsx`
- `src/components/reunioes/CentralReunioesFiltros.tsx`
- `src/components/reunioes/CentralReunioesTabela.tsx`
- `src/components/reunioes/DelegarTarefasDialog.tsx`
- `src/store/meetingTasks.ts`
- `supabase/migrations/<timestamp>_central_reunioes.sql`

**Editados**
- `src/App.tsx` (rota)
- `src/components/AppSidebar.tsx` (item de menu)
- `src/store/reunioes.ts` (novos campos + ações pós-reunião)
- `src/components/projeto/ReuniaoDialog.tsx` (cliente opcional + ações pós-reunião)
- `src/components/projeto/ReunioesTab.tsx` (badges visuais de status, sem mudar comportamento)
