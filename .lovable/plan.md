## Objetivo

Adicionar três funcionalidades **sem alterar** módulos existentes (Clientes, Projeto Completo, Demandas, Posts, Documentação, Briefing, Planejamento):

1. Módulo **"Minhas Tarefas"** — painel individual do colaborador logado.
2. **Sistema de prioridade** com ordenação inteligente (Urgente → Atrasado → Próximo prazo → Demais).
3. **Fluxo de delegação** ao concluir uma tarefa (concluir apenas vs. concluir + criar próxima).
4. **Toggle "Por Colaborador"** no Dashboard atual.

Tudo é **aditivo**: novos arquivos, novas rotas, novos componentes. Stores existentes só ganham métodos novos (não removem nada). Não há mudanças destrutivas no banco.

---

## 1. Mapeamento "usuário logado → tarefas"

Auth usa `auth.users`, mas tarefas usam `responsavel_id` (tabela `responsaveis`). O elo já existe: `profiles.responsavel_id` aponta para `responsaveis.id` (visto em `crm.ts:482`).

Será criado um helper `useResponsavelAtual()` em `src/hooks/useResponsavelAtual.ts`:
- Lê `auth.user.id`, busca `profiles.responsavel_id`, devolve o `Responsavel` correspondente.
- Cacheado em memória; recarrega no login/logout.

---

## 2. Fontes de tarefas (somente leitura, consolidação)

Novo arquivo `src/lib/minhasTarefas.ts` exporta:

```ts
export type TaskFonte = "demanda" | "post" | "planejamento" | "documentacao";
export interface UnifiedTask {
  id: string;                 // `${fonte}:${id_origem}`
  fonte: TaskFonte;
  origem_id: string;
  cliente_id: string;
  titulo: string;
  area: string;               // "Posts" | "Vídeo" | "Tráfego Pago" | "LP/Site" | "IA/Atendimento" | "Documentação" | "Planejamento" | "Urgência/Outro"
  prioridade: "Baixa"|"Media"|"Alta"|"Urgente";
  prazo: string | null;
  status: "pendente"|"em_andamento"|"atrasado"|"concluido";
  urgente: boolean;
  responsaveis_ids: string[];
  link: string;               // rota dentro do Projeto Completo
}
```

Função `buildUnifiedTasks({ demandas, cards, planejamento, documentacao, responsavelId })` consolida:

| Fonte | Tabela | Filtro do usuário | Mapa de área |
|---|---|---|---|
| Demandas | `demandas` | `responsaveis_ids` contém `responsavelId` | `categoria` → label (Vídeo, LP, Tráfego, IA/Atend., Briefing, Planejamento, Suporte, Urgência/Outro) |
| Posts | `cards` | `responsaveis_ids` contém | área = "Posts" |
| Planejamento | `cliente_planejamento_itens` | `responsavel_id` = | área = "Planejamento" |
| Documentação | `cliente_documentacao` | `enviado_por` = `auth.uid()` (campo é uuid de auth) | área = "Documentação" |

`status` derivado: `concluido` se `data_conclusao`/`status="Concluido"|"Postado"|"concluido"` ou `enviado=true`; `atrasado` se `prazo < hoje` e não concluído; `em_andamento` se status intermediário; `pendente` caso contrário.

`urgente`: demandas com `prioridade="Urgente"`, posts com `is_urgent=true`, planejamento com `prioridade="urgente"`.

**Sem nova tabela.** Tudo derivado em runtime dos stores já carregados (`useDemandas`, `useCRM`, `usePlanejamento`, `useDocumentacao`).

---

## 3. Módulo "Minhas Tarefas"

### Rota
`/minhas-tarefas` em `App.tsx`, dentro de `RequireAuth` + `AppLayout`.

### Menu lateral (`AppSidebar.tsx`)
Inserir item após "Dashboard":
```
Dashboard
Minhas Tarefas      ← NOVO  (ícone CheckSquare)
Clientes
Contratos
Alertas
Relatórios
Configurações
```

### Página `src/pages/MinhasTarefas.tsx`
Layout: header + filtros + tabela (lista, **não grade**).

**Filtros (topo):**
- Cliente (Select com lista de clientes do usuário)
- Área (multi-select com checkboxes — usa o componente `Popover+Checkbox` já presente em filtros do projeto)
- Status (pendente / em_andamento / atrasado / concluído)
- Período (componente reutilizado — ver §6)
- Busca por texto (Input com filtro client-side em `titulo` e nome do cliente)

**Tabela (Colunas):**
| Cliente | Tarefa | Área | Prioridade | Prazo | Status | Ações |
|---|---|---|---|---|---|---|

- "Cliente" mostra logo + nome (componente já usado no Dashboard)
- "Tarefa" mostra título + ícones inline (⚡ urgente, 🔴 atrasado, 🟡 próximo prazo ≤ 3 dias)
- "Prioridade" usa badge colorido por `PRIORIDADE_COR`
- "Status" usa `StatusBadge` existente quando aplicável
- "Ações": botão "Abrir" (link p/ Projeto Completo) + botão "Concluir" (abre modal de delegação)

### Componentes novos
- `src/components/tarefas/MinhasTarefasFiltros.tsx`
- `src/components/tarefas/MinhasTarefasTabela.tsx`
- `src/components/tarefas/PrioridadeIcon.tsx` (renderiza ⚡/🔴/🟡 conforme regras)
- `src/components/tarefas/ConcluirTarefaDialog.tsx` (modal de delegação — §5)

---

## 4. Ordenação por prioridade

Função pura `ordenarTarefas(tasks: UnifiedTask[])`:

```text
1. urgente=true                          → topo
2. status="atrasado"                     → segundo bloco
3. demais ordenados por prazo asc        → próximos primeiro (nulls no fim)
4. dentro do mesmo bucket: prioridade DESC (Urgente/Alta/Media/Baixa)
```

Aplicada por padrão no módulo "Minhas Tarefas" e no painel do Dashboard por colaborador.

---

## 5. Fluxo de delegação ("Concluir tarefa")

Modal `ConcluirTarefaDialog`:

**Tela 1 — escolha:**
- Botão `✔ Concluir apenas`
- Botão `🔄 Concluir e criar próxima tarefa`
- Botão `Cancelar`

**Tela 2 (apenas se "Concluir e criar próxima"):**
Formulário com:
- Novo responsável (Select de `responsaveis`)
- Título
- Área (Select com mesmas categorias usadas em `UnifiedTask.area`)
- Prazo (DatePicker)
- Prioridade (Baixa/Média/Alta/Urgente)
- Descrição (Textarea)
- Checkbox "Reutilizar anexos da tarefa anterior" (visível **só** se a tarefa origem é uma `demanda` — única fonte com tabela de anexos)

**Comportamento ao confirmar:**

A. "Concluir apenas":
- `demanda` → `useDemandas.moveStatus(id, "Concluido")`
- `post`/card → `useCRM.updateCard(id, { status: "Postado" })`
- `planejamento` → `usePlanejamento.update(id, { status: "concluido" })`
- `documentacao` → `useDocumentacao.update(id, { enviado: true, data_envio: now })`

B. "Concluir e criar próxima":
- Conclui a anterior (igual A).
- Cria **nova `demanda`** via `useDemandas.createDemanda({ ... , descricao: descricao + "\n\n— Vinculada a: " + tituloAnterior + " (id: " + idAnterior + ")" })`. Vinculação parent–child fica registrada no campo `descricao` (sem alterar schema).
- Se "Reutilizar anexos" marcado **e** origem foi demanda, copia rows de `anexos_demandas` da anterior para a nova (mesma URL, sem reupload — só `insert` apontando `demanda_id` da nova).

**Importante:** este fluxo **não substitui** os botões existentes nas demais telas — é exclusivo do botão "Concluir" da lista "Minhas Tarefas". Os Kanbans, listas e telas atuais continuam funcionando exatamente como hoje.

---

## 6. Filtro de Período reutilizável

Criar `src/components/filters/PeriodoFiltro.tsx` (componente único e reutilizável):

Opções:
- **Futuro:** Hoje · Esta semana · Próximos 7 / 14 / 30 dias
- **Passado:** Últimos 7 / 14 / 30 dias · Mês passado
- **Personalizado:** date range picker

Devolve `{ inicio: Date|null, fim: Date|null, preset: string }`. Usado em "Minhas Tarefas" e no Dashboard "Por Colaborador".

> Hoje não existe um componente único — cada tela tem sua própria implementação. Este novo componente fica disponível para reuso futuro **sem modificar** os filtros já implementados em outras telas.

---

## 7. Dashboard — toggle "Por Colaborador"

Em `src/pages/Dashboard.tsx`, no topo, adicionar `Tabs` com:
- "Visão Geral" (renderiza tudo que existe hoje — não mexer)
- "Por Colaborador" (nova aba)

### Aba "Por Colaborador" — `src/components/dashboard/DashboardPorColaborador.tsx`
- Select de colaborador (default = usuário logado, se mapeado)
- `PeriodoFiltro` (do §6)
- 4 KPIs (`KpiCard` reutilizado): Total · Pendentes · Atrasadas · Urgentes
- Gráfico de barras horizontais "Distribuição por Área" (recharts, cores semânticas)
- Lista compacta das 10 tarefas mais prioritárias (mesmo `ordenarTarefas`)

Reutiliza `buildUnifiedTasks` filtrando pelo colaborador selecionado.

---

## 8. Garantias de não-regressão

- Nenhum arquivo em `src/components/projeto/*`, `src/components/demandas/*`, `src/components/clientes/*` será editado.
- Stores (`crm.ts`, `demandas.ts`, `planejamento.ts`, `documentacao.ts`) **não terão métodos removidos**. Todos os updates de delegação reusam métodos públicos já existentes.
- Sem migração de banco (não há novas tabelas, colunas ou triggers).
- Tipos TS ficam isolados em `src/lib/minhasTarefas.ts` — não tocam tipos do Supabase.

---

## Resumo de arquivos

**Novos:**
- `src/pages/MinhasTarefas.tsx`
- `src/lib/minhasTarefas.ts`
- `src/hooks/useResponsavelAtual.ts`
- `src/components/tarefas/MinhasTarefasFiltros.tsx`
- `src/components/tarefas/MinhasTarefasTabela.tsx`
- `src/components/tarefas/PrioridadeIcon.tsx`
- `src/components/tarefas/ConcluirTarefaDialog.tsx`
- `src/components/filters/PeriodoFiltro.tsx`
- `src/components/dashboard/DashboardPorColaborador.tsx`

**Editados (aditivo):**
- `src/App.tsx` — registra rota `/minhas-tarefas`
- `src/components/AppSidebar.tsx` — adiciona item de menu
- `src/pages/Dashboard.tsx` — envolve conteúdo atual em `<Tabs>` adicionando aba "Por Colaborador"

**Banco:** nenhuma migração.
