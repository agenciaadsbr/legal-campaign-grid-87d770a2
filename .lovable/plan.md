## Problema

Hoje, nos cards em coluna **Planejamento** (tanto no Kanban de Posts do Cliente quanto no Kanban de Demandas), o único caminho disponível é o botão **"Iniciar tarefa" / "Iniciar Demanda"**. Não dá para abrir o card e editar seus dados (responsáveis, prazo, descrição, etc.) antes de iniciar.

Comportamento esperado: o usuário deve poder **clicar no card** para abrir o detalhe/edição mesmo quando está em "Planejamento", mantendo o botão de iniciar tarefa como ação rápida ao lado.

## Escopo (apenas estes dois módulos)

1. **Clientes** — `src/components/clientes/PostsKanbanCliente.tsx` (usado em `ClienteDetalhe` e na "Visão Geral" do `ProjetoCliente`).
2. **Demandas** — `src/components/demandas/ProjetoKanban.tsx` (usado em `ProjetoDemandasCliente` e em `ProjetoCliente`) e `src/components/demandas/DemandCard.tsx` (clique do card).

Nada fora destes dois módulos será tocado.

## Mudanças

### 1. Posts do Cliente (`PostsKanbanCliente.tsx`)

Atualmente, em `CardItem`:
- Se `status_card === "Planejamento"` → renderiza apenas a `<div>` interna (sem `<Link>`), bloqueando navegação para o post.
- Se `!== "Planejamento"` → embrulha em `<Link to={posts/${post.id}}>`.

Fix:
- Sempre embrulhar em `<Link>` quando existir `post` correspondente, inclusive em "Planejamento". O post já é criado junto com o card, então a rota `posts/:id` existe.
- Manter o botão **"Iniciar tarefa"** intacto (já tem `e.preventDefault()` + `e.stopPropagation()` no handler, então o clique nele não vai navegar).
- Manter a edição inline do título (já tem `stopPropagation`).
- Caso não exista `post` para o card, manter fallback sem link (não regredir).

### 2. Demandas em Planejamento (`ProjetoKanban.tsx` + `DemandCard.tsx`)

Atualmente em `ProjetoKanban`:
- O `DemandCard` recebe `onClick={() => onOpen(d)}` para todas as colunas — **clique no card já abre o detalhe**.
- Para a coluna "Planejamento", recebe `extraAction` com o botão **"Iniciar Demanda"**.
- Em `DemandCard.tsx`, o `extraAction` é renderizado dentro de um `<div onClick={(e) => e.stopPropagation()}>`, então o botão não dispara o `onClick` do card.

Verificação: o clique no card de planejamento **já** abre o `DemandaDetalheDialog`. Aparentemente o problema reportado é apenas o de Posts.

Fix de robustez (defensivo):
- Garantir que o handler `iniciar` em `ProjetoKanban` chame `e.stopPropagation()` para evitar qualquer condição em que o clique no botão também dispare `onClick` do card.

## Arquivos alterados

- `src/components/clientes/PostsKanbanCliente.tsx` — sempre envolver o card em `<Link>` quando houver post associado, incluindo Planejamento.
- `src/components/demandas/ProjetoKanban.tsx` — adicionar `stopPropagation` no `iniciar`.

## Resultado esperado

- **Posts (Clientes)**: clicar em qualquer ponto do card de Planejamento (exceto botão "Iniciar tarefa", título em modo edição e botão de urgência) abre o detalhe do post para edição. Botão "Iniciar tarefa" continua disparando o diálogo `IniciarTarefaDialog` normalmente.
- **Demandas**: clicar em qualquer card de Planejamento (exceto botão "Iniciar Demanda") abre `DemandaDetalheDialog`. O botão continua iniciando a demanda sem reabrir o detalhe.
- Drag-and-drop, filtros, e demais comportamentos preservados.
