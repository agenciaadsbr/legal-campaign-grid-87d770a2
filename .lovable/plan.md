## Próxima rodada — Workflow visível e bloqueio operacional

Adicionar 3 melhorias **não destrutivas** sobre o sistema de dependências já criado (tabela `task_dependencies`, helpers em `src/lib/workflow.ts`, store `useDemandas.dependencies`).

---

### 1. Bloqueio de drag-and-drop no Kanban de demandas

Arquivos: `src/components/demandas/ProjetoKanban.tsx`, `src/components/demandas/DemandasKanban.tsx`.

- Ler `dependencies` via `useDemandas((s) => s.dependencies)`.
- Calcular `bloqueadas = Set<id>` com `isAguardandoDependencia(d.id, deps)`.
- Em cada `DemandCard`:
  - Se a demanda está bloqueada, passar `draggable={false}` e adicionar handler `onDragStart` que chama `e.preventDefault()` (para anular qualquer arrasto).
  - Aplicar uma classe sutil (`opacity-80 cursor-not-allowed`) no wrapper para sinalizar.
- No `iniciar()` do `ProjetoKanban` (botão "Iniciar Demanda"): se bloqueada, mostrar `toast` de erro ("Aguardando liberação da etapa anterior") e abortar.
- Não alterar a lógica do `moveStatus` no store (apenas bloqueio na UI; o status selector já bloqueia no diálogo).

---

### 2. Seção "Aguardando liberação" em Minhas Tarefas

Arquivos: `src/lib/minhasTarefas.ts`, `src/pages/MinhasTarefas.tsx`, `src/components/tarefas/MinhasTarefasTabela.tsx` (somente se necessário para chip visual).

- Em `UnifiedTask`, adicionar campo opcional `aguardando_liberacao?: boolean`.
- Em `buildUnifiedTasks` (tarefas de fonte `demanda`), aceitar `dependencies` opcional e marcar `aguardando_liberacao = isAguardandoDependencia(demanda.id, deps)`.
- Em `MinhasTarefas.tsx`:
  - Passar `dependencies` (do store de demandas) para o builder.
  - Adicionar **5º KPI** "Aguardando" (icone `Lock`) com a contagem de `tarefasFiltradas.filter(t => t.aguardando_liberacao)` — ajustando o grid para `md:grid-cols-5`.
  - Renderizar uma **segunda tabela** abaixo da principal, intitulada "🔒 Aguardando liberação", contendo apenas as tarefas com `aguardando_liberacao = true`. A tabela principal continua exibindo todas (inclusive bloqueadas) para não quebrar comportamento atual — opcionalmente adicionar pequeno badge 🔒 na linha.
  - A seção só aparece se houver ao menos 1 tarefa nesse estado.

---

### 3. KPIs de gargalos no Dashboard

Arquivo: `src/components/demandas/DashboardDemandasSection.tsx`.

Adicionar 2 KPIs ao grid (passa para `lg:grid-cols-7`):

- **Bloqueadas** — total de demandas com `isAguardandoDependencia(d.id, deps)` e status ≠ `Concluido`. Indica gargalos atuais.
- **Tempo médio de liberação** — média, em horas, de `(liberado_em - created_at)` sobre `dependencies.filter(d => d.liberado && d.liberado_em)`. Exibido como "Xh" ou "Xd Yh". Se não houver liberações, mostrar `—`.

Implementação: ler `dependencies` do store; cálculo em `useMemo`.

---

### Fora do escopo

- Mudanças no schema do banco (já feito na rodada anterior).
- Reordenação automática do Kanban / agrupamento por bloqueio.
- Notificações push para tarefas liberadas.
- Métricas de gargalo por responsável (pode entrar em rodada futura).

---

### Garantias

- Nenhuma tarefa, regra ou dado existente é removido ou alterado.
- Comportamento atual do Kanban e de Minhas Tarefas preservado para tarefas **sem** dependências (lista vazia → tudo segue como hoje).
- Tokens semânticos do design system mantidos (sem cores hardcoded).