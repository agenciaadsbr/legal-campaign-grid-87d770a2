## Workflow Encadeado entre Demandas

Adicionar continuidade operacional entre demandas do Projeto Completo, sem alterar tarefas existentes nem quebrar nada que já funciona. Tudo é **aditivo**: novas tabelas, novo status virtual, novos campos opcionais no modal.

---

### 1. Banco de dados (migration aditiva)

**Nova tabela `task_dependencies`**
- `id`
- `task_id` (uuid → demandas.id) — tarefa que depende
- `depends_on_task_id` (uuid → demandas.id) — tarefa-pai
- `modo_liberacao` `'automatico' | 'manual'` (default `'automatico'`)
- `liberado` boolean (default false)
- `liberado_em` timestamp
- `created_at`
- RLS: leitura para autenticados; insert/update/delete para `can_write`

**Novo status virtual `AGUARDANDO_DEPENDENCIA`**
- Não alterar o enum `demanda_status` (evita migração destrutiva).
- Implementar como **estado derivado**: a demanda está "aguardando" se existe linha em `task_dependencies` onde `task_id = demanda.id` e `liberado = false`.
- Persistir o status original em `demandas.status` normalmente (ex.: `Planejamento`); a UI mostra badge "Aguardando dependência" quando a tarefa está bloqueada.

**Trigger de liberação automática**
- Em `AFTER UPDATE` em `demandas`: quando `status` muda para `Concluido` ou `Entregue`, marcar `task_dependencies.liberado = true` para todas as filhas com `modo_liberacao = 'automatico'`.
- Registrar entrada em `historico_demandas` (`acao = 'dependencia_liberada'`).

**Compatibilidade**
- Demandas antigas: nenhuma linha em `task_dependencies` → comportamento idêntico ao atual.
- Nada removido, nada renomeado.

---

### 2. Store (`src/store/demandas.ts`)

- Adicionar `dependencies: TaskDependency[]` ao state e carregar junto com demandas.
- Helpers:
  - `isAguardandoDependencia(demandaId)` → boolean
  - `getDependenciaPai(demandaId)` → Demanda | null
  - `getProximasEtapas(demandaId)` → Demanda[]
- Ações:
  - `createDemandaComProxima(input, proxima?)` — cria demanda principal e, se `proxima` estiver presente, cria a filha + linha em `task_dependencies`.
  - `liberarDependenciaManual(taskId)` — marca `liberado = true`.
- Realtime: subscribe em `task_dependencies` para refletir liberações.

---

### 3. Modal de criação/edição (`DemandaDetalheDialog` + form de criação)

Adicionar **nova seção "Workflow / Continuidade"** ao final do form:

- ☑ **Criar próxima etapa vinculada** (collapsed por padrão)
- Quando marcado, expandir bloco com os mesmos campos da criação de demanda:
  - título, categoria, subtipo, responsáveis, prioridade, prazo, descrição, link_meister, link_drive
- ☑ **Bloquear execução até concluir esta tarefa** (default: ligado)
- Modo de liberação: radio `Automático` / `Manual`
- **Herança de dados** (checkboxes individuais):
  - ☑ reaproveitar descrição
  - ☑ reaproveitar links (meister/drive)
  - ☑ reaproveitar anexos (copia linhas em `anexos_demandas` para a nova demanda)

Na edição de uma demanda já existente, mostrar a mesma seção para permitir adicionar uma próxima etapa depois.

---

### 4. UI de bloqueio operacional

Em `DemandaDetalheDialog` quando `isAguardandoDependencia(d.id)`:

- Badge cinza com cadeado "Aguardando: <título da pai>" (clicável → abre a pai).
- Desabilitar:
  - botão "Iniciar"
  - mudança de status para `Criar`/`Revisar`/`Entregue`/`Concluido`
  - drag-and-drop de coluna no Kanban
- Tooltip nos controles desabilitados: "Esta tarefa depende da conclusão de: <título>".
- **Continua editável**: título, descrição, responsáveis, prazo, anexos, comentários, links, checklist.

No `DemandCard`:
- Ícone 🔒 quando aguardando dependência.
- Ícone 🔗 quando a demanda tem `proximas_etapas.length > 0`.

---

### 5. Seção "Etapas relacionadas" no modal

Bloco visual mostrando a cadeia:

```
← Etapa anterior: 🎥 Editar vídeo (Concluído)
   Atual:        📈 Subir campanha
→ Próxima:       🚀 Publicar Meta (Aguardando)
```

Cada item é clicável e abre o modal correspondente.

---

### 6. Liberação manual

Quando uma demanda com filhos `modo_liberacao = 'manual'` é concluída, mostrar **toast com ação**:

> "Deseja liberar agora: Criar campanha Google Ads?" [Liberar] [Depois]

Também botão "Liberar agora" dentro do modal da filha, visível apenas para `can_write`.

---

### 7. Regras de prazo

Em `auto_marcar_demanda_atrasada` e `marcar_demandas_atrasadas`: adicionar cláusula que **ignora** demandas com dependência não liberada (`NOT EXISTS (SELECT 1 FROM task_dependencies WHERE task_id = demandas.id AND liberado = false)`).

Quando dependência for liberada, o `data_limite` continua o mesmo (regra simples). Se o usuário quiser, edita manualmente. _Opção futura_: recalcular prazo a partir da liberação — fora do escopo desta entrega.

---

### 8. Minhas Tarefas, Dashboard, Relatórios

- **MinhasTarefasTabela**: adicionar nova seção colapsável **🔒 Aguardando liberação**, separada de Pendentes/Atrasadas/Concluídas. Tarefas aguardando contam no total geral mas não em "atrasadas".
- **Dashboard / RelatoriosDemandas**:
  - novo KPI "Aguardando liberação"
  - lista "Gargalos por responsável" (quem tem mais filhas bloqueadas pelas suas pais)
  - "Tempo médio de liberação" (média de `liberado_em - created_at` da dependência)
- Filtros existentes ganham opção "Aguardando dependência".

---

### 9. Indicadores visuais nos Kanbans

- `DemandCard` e `ProjetoKanban`: badges 🔗 (tem próxima) e 🔒 (aguardando).
- No Kanban, cards bloqueados têm `cursor-not-allowed` e não são `draggable`.

---

### Detalhes técnicos

**Arquivos a criar:**
- `supabase/migrations/<timestamp>_workflow_dependencies.sql` — tabela, índices, RLS, trigger.
- `src/lib/workflow.ts` — helpers e tipos (`TaskDependency`, `isBloqueada`, etc).
- `src/components/demandas/WorkflowSection.tsx` — bloco "Próxima etapa" no modal.
- `src/components/demandas/EtapasRelacionadas.tsx` — visual da cadeia.

**Arquivos a editar (adicionar, não remover):**
- `src/store/demandas.ts` — state, ações, realtime.
- `src/components/demandas/DemandaDetalheDialog.tsx` — seção workflow, bloqueio operacional, etapas relacionadas, botão liberar manual.
- `src/components/demandas/DemandCard.tsx` — badges 🔗 / 🔒.
- `src/components/demandas/DemandasKanban.tsx` e `ProjetoKanban.tsx` — bloquear DnD para aguardando.
- `src/components/tarefas/MinhasTarefasTabela.tsx` — seção "Aguardando liberação".
- `src/components/demandas/DashboardDemandasSection.tsx` e `RelatoriosDemandas.tsx` — novos KPIs.
- `src/lib/minhasTarefas.ts` — agrupar `aguardando` separadamente.

**Não alterado:**
- enum `demanda_status` no Postgres
- estrutura existente de `demandas`, `anexos_demandas`, `comentarios_demandas`, `historico_demandas`
- comportamento de demandas sem dependência

---

### Entrega incremental sugerida

1. Migration + store + helpers.
2. Modal: seção "Workflow" + criação encadeada + herança.
3. Bloqueio operacional + badges nos cards + Kanban.
4. Etapas relacionadas + liberação manual + ajustes de prazo.
5. Minhas Tarefas + Dashboard + Relatórios.

Cada etapa é independente e o sistema permanece funcional após cada uma.
