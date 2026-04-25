## Problema

Na aba **Clientes**, o grupo **"Revisar"** está sumindo quando não há clientes nele. Isso acontece em `src/pages/Clientes.tsx` linha **931**:

```ts
if (items.length === 0) return null;
```

Esse `return null` esconde qualquer grupo vazio — incluindo "Revisar", "Criar" e "Concluídos".

Além disso, hoje a classificação em `gruposPosts` (linhas 828-842) só considera o cliente como "Revisar" ou "Criar" se ele **tiver pelo menos um post pendente**. Clientes sem post pendente caem em "Concluídos" (que fica oculto se `mostrarConcluidos = false`) — então eles **somem da listagem**, contrariando a regra "todos os clientes devem ficar visíveis na aba Clientes".

## Correção (mínima, sem mexer em estrutura/layout)

Em **`src/pages/Clientes.tsx`**:

### 1. Sempre renderizar os grupos fixos (linhas 920-954)

Remover o `if (items.length === 0) return null;` para os grupos **Revisar** e **Criar** — eles ficam sempre visíveis, mesmo vazios, com o contador `0` e um estado vazio discreto ("Nenhum cliente neste status").
O grupo **Concluídos** continua respeitando a flag `mostrarConcluidos` (sem mudança nesse comportamento).

### 2. Garantir que todo cliente apareça em algum grupo (linhas 828-842)

Ajustar `gruposPosts` para que **nenhum cliente desapareça**:
- Cliente com post pendente em status "Revisar" → grupo **Revisar**.
- Cliente com post pendente em status "Criar" (ou demais status pendentes) → grupo **Criar**.
- Cliente sem nenhum post pendente → grupo **Concluídos** (visível só com toggle, comportamento atual mantido).
- Cliente **sem cards nenhum** → cai por padrão em **Criar** (em vez de Concluídos), para ficar visível imediatamente. _(Isso reflete melhor a referência do ClickUp: cliente novo aparece num grupo de trabalho, não em "Concluídos".)_

### 3. Cabeçalho da página (linha 854)

Atualizar o subtítulo para refletir que ambos os grupos ficam fixos:
`{clientes.length} clientes • Revisar • Criar` (já está nesse espírito; só garantir que não some).

## O que NÃO muda

- Layout, cores, tokens, sidebar, colunas, filtros — tudo intacto.
- Tabela `status_options` (status do cliente: Ativo / Pausado / etc.) — sem alteração.
- Lógica de `primary_status` no banco — sem alteração.
- Componentes `ColorBadge`, `StatusBadge`, `OpcoesEditor` — sem alteração.
- Página `ClienteDetalhe`, kanban dos posts — sem alteração.

## Arquivo afetado

- `src/pages/Clientes.tsx` (apenas o bloco de agrupamento + render dos grupos, ~20 linhas).

Nenhuma migration, nenhum outro arquivo tocado.