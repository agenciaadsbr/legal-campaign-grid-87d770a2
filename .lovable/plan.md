
# Padronizar lógica de responsáveis (Clientes/Posts vs Demandas)

## Objetivo
Separar definitivamente os filtros de responsáveis nos dois módulos, eliminando qualquer mistura com o "responsável geral do cliente". Sem alterações no banco, rotas ou estrutura de tabelas.

## Mudanças

### 1. Módulo Clientes/Posts — filtrar por responsável dos POSTS (cards)

**`src/pages/Clientes.tsx` (linha ~1157)** — visão lista/tabela na rota `/clientes`
- Hoje: filtra por `c.responsaveis` (responsável geral do cliente).
- Novo: cliente entra no resultado apenas se existir algum **card** desse cliente cujo `card.responsaveis` contenha o responsável selecionado.
  - Construir um `Map<clienteId, Set<responsavelId>>` a partir de `cards`.
  - Aplicar: `filtroResponsaveis.length === 0 || filtroResponsaveis.some(r => respsPorCliente.get(c.id)?.has(r))`.
- Mesma regra para o toggle "Apenas minhas" (usa `currentUserId` contra responsáveis dos cards, não do cliente).

**`src/components/clientes/ClientesGeralTable.tsx` (linhas ~53 e ~59)**
- Mesma substituição: filtrar por responsáveis dos cards do cliente, nunca por `c.responsaveis`.

**`src/components/clientes/PostsKanbanCliente.tsx`** — já correto (filtra por `c.responsaveis` do card). Sem alteração de lógica.

### 2. Módulo Demandas — filtrar apenas por responsável da DEMANDA

**`src/pages/Demandas.tsx`** — já correto na linha 67 (`d.responsavel_id !== fResp`). Sem alteração.

**`src/components/demandas/ClientesDemandasTable.tsx`** — já correto na linha 48. Sem alteração de lógica de filtro.
- Pequeno ajuste de coluna: a coluna "Responsáveis" da tabela mostra hoje `clienteAtual?.responsaveis` (responsável geral). Manter exibição (é informativo), mas renomear o cabeçalho para **"Responsáveis do cliente"** para deixar claro que NÃO é o filtro aplicado.

### 3. Responsável geral do cliente
- Permanece opcional no cadastro/edição do cliente.
- Não entra em nenhum filtro de Posts nem de Demandas.
- Aparece apenas como dado informativo (tabela geral).

### 4. Autopreenchimento ao criar Nova Demanda

**`src/components/demandas/NovaDemandaDialog.tsx`**
- Ao selecionar `cliente_id` (ou ao abrir já com `defaultClienteId`), se `responsavel_id` ainda estiver vazio:
  - Buscar os cards desse cliente; pegar o responsável mais frequente entre `card.responsaveis` (fallback: primeiro responsável do primeiro card).
  - Setar como sugestão inicial em `responsavel_id`.
- O usuário pode trocar manualmente. Salvar normalmente, independente do cliente.
- Aplicar a mesma sugestão em `DemandaRapidaDialog.tsx` se houver campo de responsável (verificar e replicar).

### 5. Labels (UX)

**Clientes/Posts** — onde aparece o filtro de responsáveis:
- `src/pages/Clientes.tsx`: trocar placeholder/título do filtro para **"Responsável do Post"**.
- `src/components/clientes/ClientesGeralTable.tsx`: idem no popover/cabeçalho do filtro.
- `src/components/clientes/PostsKanbanCliente.tsx`: trocar "Filtrar por responsável" e "Todos responsáveis" para versões com **"do post"**.

**Demandas**:
- `src/pages/Demandas.tsx`: filtro `<SelectValue placeholder="Responsável" />` → **"Responsável da Demanda"** (placeholder e item "Todos responsáveis da demanda").
- `src/components/demandas/NovaDemandaDialog.tsx` e `DemandaRapidaDialog.tsx`: label `Responsável` → **"Responsável da Demanda"**.
- `ClientesDemandasTable.tsx`: cabeçalho da coluna informativa → **"Responsáveis do cliente"**.

## Validação manual (cenário de teste do briefing)

Cliente Alves Gomes, posts atribuídos a Bianca, demandas a Rafael e Vitória:
- Filtro "Bianca" em **Clientes/Posts** → mostra Alves Gomes.
- Filtro "Bianca" em **Demandas** → não mostra nada.
- Filtro "Rafael" em **Demandas** → mostra Demanda 1.
- Filtro "Vitória" em **Demandas** → mostra Demanda 2.

## Restrições respeitadas
- Sem migrations, sem alteração de tabelas/colunas, sem mudança de rotas.
- Apenas lógica de filtro, autopreenchimento e labels visuais.

## Arquivos a editar
- `src/pages/Clientes.tsx`
- `src/components/clientes/ClientesGeralTable.tsx`
- `src/components/clientes/PostsKanbanCliente.tsx` (apenas labels)
- `src/pages/Demandas.tsx` (apenas labels)
- `src/components/demandas/ClientesDemandasTable.tsx` (apenas label de coluna)
- `src/components/demandas/NovaDemandaDialog.tsx` (autopreencher + label)
- `src/components/demandas/DemandaRapidaDialog.tsx` (autopreencher + label, se aplicável)
