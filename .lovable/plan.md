# Renomear "Revisar" → "Aguardando aprovação do cliente" + rastreamento

## Objetivo
Trocar apenas o **rótulo exibido** do status `Revisar` para `Aguardando aprovação do cliente` em todo o sistema, preservando o identificador interno (`Revisar`) — sem migração de dados, sem novo status. Adicionar campo de quando a tarefa entrou nesse status, cálculo de dias aguardando, novas colunas, filtro, grupo e badge visual na Central de Tarefas.

---

## 1. Banco de dados (migração)

Adicionar colunas para rastreamento (não destrutivo):

- `demandas.approval_waiting_since timestamptz NULL`
- `demandas.approval_waiting_by uuid NULL`
- `demandas.approval_previous_status text NULL`
- `cards.approval_waiting_since timestamptz NULL`
- `cards.approval_waiting_by uuid NULL`
- `cards.approval_previous_status text NULL`

**Trigger** em `demandas` e `cards` (BEFORE UPDATE de `status`):
- Se `NEW.status = 'Revisar'` e `OLD.status <> 'Revisar'`: preenche `approval_waiting_since = now()`, `approval_waiting_by = auth.uid()`, `approval_previous_status = OLD.status`.
- Se `OLD.status = 'Revisar'` e `NEW.status <> 'Revisar'`: registra em `atividade_cliente` `"Tarefa saiu de Aguardando aprovação do cliente após X dias."` e limpa os 3 campos.
- Quando entra: também registra em `atividade_cliente` `"Tarefa movida para Aguardando aprovação do cliente."`.

**Backfill único** (idempotente, dentro da migração):
- Para `demandas` com `status = 'Revisar'` e `approval_waiting_since IS NULL`: usar a data do registro mais recente em `historico_demandas` com `para_status = 'Revisar'`; se não houver, usar `updated_at`.
- Para `cards` com `status = 'Revisar'` sem `approval_waiting_since`: usar `updated_at`.

Sem alterar enum `demanda_status` — mantém o valor `Revisar`.

---

## 2. Rótulo visível (frontend)

Trocar o **label** sem mudar o identificador interno:

- `src/lib/demandas-categorias.ts` → `STATUS_DEMANDA_LABEL.Revisar = "Aguardando aprovação do cliente"`.
- `src/components/StatusBadge.tsx` → no `statusMap.Revisar`, `label: "Aguardando aprovação do cliente"`.
- `src/store/crm.ts` / pontos onde a UI mostra `"Revisar"` literal (posts/cards) → usar helper de label central. Criar `getStatusLabel(status)` em `src/lib/status-labels.ts` reutilizável por Posts/Vídeos/Tráfego/LP/IA/Operacional/Urgências/Kanbans/Dashboard/Relatórios.
- Comparações internas (`d.status === "Revisar"`, filtros, kanban columns, `STATUS_DEMANDA`) **permanecem** como `"Revisar"`.

Resultado: todas as abas, kanbans, badges, dashboards e relatórios passam a exibir o novo nome automaticamente.

---

## 3. Central de Tarefas (`src/lib/minhasTarefas.ts` + componentes)

Estender `UnifiedTask`:
```ts
approval_waiting_since?: string | null;
approval_dias?: number | null; // calculado
```

Calcular `approval_dias` = `floor((now - approval_waiting_since) / 86400000)` quando o status interno é `Revisar`.

**`MinhasTarefasTabela.tsx`**:
- Adicionar duas colunas entre "Status" e "Ações":
  - `Entrada em aprovação` → data formatada `dd/MM/yyyy` ou `—`.
  - `Dias em aprovação` → `N dias` com badge:
    - 0–2: badge `secondary` (normal)
    - 3–6: badge `outline` cor `warning` (atenção leve)
    - 7+: badge `destructive` (atenção alta)
- Novo grupo (`GroupKey`) `aprovacao` → "AGUARDANDO APROVAÇÃO DO CLIENTE", separado de Atrasadas / Em andamento / Pendentes / Concluídas. Ordenar por: dias desc → prazo asc → prioridade desc.
- Em `mapStatus`: tarefas com status interno `Revisar` viram grupo `aprovacao` (não mais `em_andamento`).

**`MinhasTarefasFiltros.tsx`**:
- Adicionar opção de filtro `"Aguardando aprovação do cliente"` (mapeia para grupo `aprovacao`).

---

## 4. Kanbans (Projeto Completo)

Nenhuma mudança estrutural. A coluna "Revisar" passa a renderizar o label novo via `STATUS_DEMANDA_LABEL`. Posição preservada. Outros status (Planejamento, Criar, Entregue, Concluído, Atrasado, Aguardando etapa anterior) inalterados.

---

## 5. Histórico / Atividades

Trigger SQL (item 1) já registra entrada e saída do status com a mensagem solicitada e o número de dias. `historico_demandas` continua registrando a transição via trigger existente `log_historico_demanda`.

---

## 6. Arquivos afetados

**Migração nova**: `supabase/migrations/<timestamp>_aprovacao_cliente.sql`

**Frontend**:
- `src/lib/demandas-categorias.ts` (label)
- `src/components/StatusBadge.tsx` (label)
- `src/lib/status-labels.ts` (novo helper opcional)
- `src/lib/minhasTarefas.ts` (campos novos + grupo aprovacao)
- `src/components/tarefas/MinhasTarefasTabela.tsx` (colunas, grupo, badge)
- `src/components/tarefas/MinhasTarefasFiltros.tsx` (opção de filtro)
- `src/pages/MinhasTarefas.tsx` (incluir grupo aprovacao em KPIs/render)
- `src/store/demandas.ts` / `src/store/crm.ts` — apenas tipar os novos campos (sem mudar lógica)
- `src/integrations/supabase/types.ts` será regenerado após a migração

---

## Garantias

- Identificador interno `Revisar` preservado → zero impacto em queries, RLS, triggers e enum existentes.
- Backfill preenche `approval_waiting_since` para tarefas que já estão em `Revisar`.
- Nenhum dado removido. Nenhum status criado. Nenhum kanban alterado estruturalmente. Outras funcionalidades da Central de Tarefas intactas.
