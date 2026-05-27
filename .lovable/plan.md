
# Remover agrupamento sintético "Em andamento" da Central de Tarefas

A Central passa a exibir sempre o status real/oficial (igual ao detalhe e ao Kanban). Sem mudanças no banco, no Kanban, nos enums ou no layout.

## Mudanças

### 1. `src/lib/minhasTarefas.ts`
- Remover `"em_andamento"` do tipo `TaskStatus`.
- Remover `em_andamento` de `STATUS_LABEL`.
- Demandas (linha ~210): remover `raw === "Criar" || raw === "Entregue" → "em_andamento"`. Default fica `"pendente"`. `status_raw` já é preenchido com o status oficial.
- Posts (linha ~343): remover `algumAtivoEmAndamento → "em_andamento"`. Default vira `"pendente"` (ou `"atrasado"` se realmente vencido). Preencher `status_raw = "Criar"` quando houver cards ativos em "Criar", para a célula Status exibir "Criar".
- Planejamento (linha ~387): converter `p.status === "em_andamento"` para `"pendente"` na Central. Store interno do planejamento continua usando seu próprio valor — sem impacto.

### 2. `src/components/tarefas/MinhasTarefasTabela.tsx`
- Remover `em_andamento` de `STATUS_COR`, `GroupKey`, `GROUP_ORDER`, `GROUP_META` e do objeto `buckets`.
- Célula "Status" (linha ~280): trocar `STATUS_LABEL[t.status]` por `t.status_raw ?? STATUS_LABEL[t.status]`. A cor continua via `STATUS_COR[t.status]` (pendente/atrasado/aprovacao/monitorados/concluido).

### 3. Não tocar
- `MinhasTarefasFiltros.tsx` — sem referência ao termo.
- `MinhasTarefas.tsx` linha 300 (mapping interno de planejamento) — mantém.
- `RelatoriosDemandas.tsx` KPI "Em andamento" — fora da Central, mantém.
- Enums do banco, Kanban, detalhe da tarefa, filtros do board.

### 4. `public/version.json`
Bump para `2026-05-27-remover-em-andamento`.

## Resultado

- Sem grupo, filtro ou label "Em andamento" / "Em execução" na Central.
- Tarefas em "Criar", "Planejamento" e "Entregue" aparecem com esses nomes na coluna Status, agrupadas em "Pendentes".
- Atrasadas / Aguardando / Concluídas continuam funcionando como antes.
- Nenhum dado alterado no banco; nenhuma coluna nova; layout intacto.
