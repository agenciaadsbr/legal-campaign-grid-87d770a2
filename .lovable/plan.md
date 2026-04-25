## Problema

Na aba **Clientes**, o agrupamento atual só joga o cliente em **"Revisar"** quando `primary_status === "Revisar"` (linha 839 de `src/pages/Clientes.tsx`).

Isso ignora dois casos críticos que precisam de atenção imediata:
- Cliente com card **Atrasado** (status `Atrasado` ou `data_agendada` no passado).
- Cliente com card **Urgente** (`is_urgent = true`).

Hoje esses clientes caem em "Criar", então o usuário perde a visibilidade dos cards que mais importam.

A boa notícia: o cálculo de atrasado/urgente já existe e está pronto em `tarefasPorCliente` (linhas 802-818) — só precisamos usá-lo na hora de classificar o grupo.

## Correção (mínima, só lógica de agrupamento)

Em **`src/pages/Clientes.tsx`**, ajustar `gruposPosts` (linhas 828-843) para que um cliente entre em **"Revisar"** quando QUALQUER uma das condições abaixo for verdade:

1. `primary_status === "Revisar"` (comportamento atual mantido).
2. Tem pelo menos 1 card **atrasado** (`tarefasPorCliente[c.id].atrasado.length > 0`).
3. Tem pelo menos 1 card **urgente** (`tarefasPorCliente[c.id].urgente.length > 0`).

Ordem de avaliação dentro do memo:
- Se `concluido` → Concluídos (regra atual mantida, respeita `mostrarConcluidos`).
- Senão, se atende qualquer condição acima → **Revisar**.
- Senão → **Criar** (default, mantém todo cliente visível).

Adicionar `tarefasPorCliente` nas dependências do `useMemo`.

## O que NÃO muda

- Layout, cores, tokens, sidebar, tabela, filtros — intactos.
- Lógica de `tarefasPorCliente` (cálculo de atrasado/urgente/hoje) — sem alteração.
- Função `update_client_primary_status` no banco — sem alteração.
- Grupos fixos "Revisar" e "Criar" continuam sempre visíveis (correção anterior preservada).
- Toggle de "Concluídos" — comportamento atual mantido.
- Cabeçalho, contadores, estado vazio — sem mudança visual.

## Arquivo afetado

- `src/pages/Clientes.tsx` — apenas o bloco `gruposPosts` (~5 linhas alteradas).

Nenhuma migration, nenhum outro arquivo tocado.