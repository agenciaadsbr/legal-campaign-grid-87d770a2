## Problema

Hoje o módulo "Minhas Tarefas" agrupa posts por `cliente + responsável + (ano, mês_referencia)`. Como cada mês contém ~4 cards, contratos de 3 meses aparecem como 3 tarefas de "Criar 4 posts" — em vez de 1 tarefa de "Criar 12 posts".

O usuário quer: **uma única tarefa por cliente/contrato/responsável**, refletindo a duração total do contrato (3 meses → 12 posts, 6 meses → 24 posts, etc.).

## Mudança (escopo único: `src/lib/minhasTarefas.ts`)

Reescrever apenas o bloco `--- Posts (cards) ---`. Tudo mais (Demandas, Planejamento, Documentação, ordenação, filtros) permanece intacto.

### Nova lógica de agrupamento

Chave do grupo: `cliente_id :: responsavelId :: contrato_id` (ou apenas `cliente_id :: responsavelId` se não houver contrato — fallback).

1. Para cada `responsavelId`, filtrar `cards` onde `responsaveis` inclui o responsável.
2. Resolver o `contrato` do cliente: usar `contratos.find(c => c.cliente_id === card.cliente_id)`. Se houver múltiplos, escolher o que cobre `data_agendada` (entre `data_inicio` e `data_fim`); fallback: contrato `Ativo` mais recente.
3. Agrupar todos os cards do mesmo `(cliente, responsável, contrato)` em UM único `UnifiedTask`.

### Campos da tarefa agrupada

- `id`: `posts:<cliente_id>:<responsavelId>:<contrato_id|all>`
- `titulo`:
  - Se houver pendentes: `"Criar X posts"` (X = nº de cards com `status_card !== "Postado"`)
  - Se todos concluídos: `"X posts concluídos"`
- `prazo`: menor `data_agendada` entre os pendentes; fallback `contrato.data_fim`
- `prioridade`: `Urgente` se algum card `is_urgent`, senão `Media`
- `status`: `concluido` (todos postados) | `atrasado` (prazo < hoje) | `em_andamento` (algum em Criar/Revisar/Agendar) | `pendente`
- `urgente`: `algumUrgente`
- `area`: `"Posts"`
- `link`: `/clientes/<cliente_id>/projeto?tab=posts` (sem filtro de lote — abre todos os posts do cliente)

### BuildArgs

Adicionar `contratos: Contrato[]` ao `BuildArgs`. Atualizar o caller em `src/pages/MinhasTarefas.tsx` para passar `contratos` da `useCRM`.

## Resultado esperado

| Antes | Depois |
|---|---|
| AL Advocacia — Criar 4 posts (3x linhas, uma por mês) | AL Advocacia — Criar 12 posts (1 linha) |
| KPI Total contava cada mês | KPI Total conta 1 por contrato |

Botão "Abrir posts" continua levando à aba Posts do cliente; KPIs permanecem corretos automaticamente porque derivam de `todasTarefas`.

## Arquivos afetados

- `src/lib/minhasTarefas.ts` — reescrever apenas o bloco de Posts e o tipo `BuildArgs`.
- `src/pages/MinhasTarefas.tsx` — passar `contratos` no `buildUnifiedTasks(...)`.
- `public/version.json` — bump.

Nenhuma alteração em banco, em cards, em Projeto Completo ou em outros módulos.
