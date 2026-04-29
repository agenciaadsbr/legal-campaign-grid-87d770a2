## Objetivo
Na aba **Posts** do projeto do cliente, eliminar a barra de rolagem vertical lateral da página (a marcada em vermelho no print). Mantém-se apenas:
- a barra de rolagem vertical interna de cada coluna de status (Planejamento, Criar, Revisar, Agendado, Postado, Atrasado);
- a barra horizontal embaixo do kanban (necessária para alcançar as colunas que ficam fora da tela).

## Causa atual
Em `src/components/clientes/PostsKanbanCliente.tsx` a coluna usa `max-h-[calc(100vh-260px)]`. Somando breadcrumb + header do projeto + tabs + filtros + paginação + scrollbar horizontal, o conteúdo total ultrapassa em alguns pixels a viewport, e o `<main className="overflow-auto">` (em `AppLayout.tsx`) renderiza a barra de rolagem da página.

## Mudança
Em `src/components/clientes/PostsKanbanCliente.tsx`:

1. Envolver o retorno do `PostsKanbanCliente` em um wrapper que ocupa exatamente a altura disponível e bloqueia overflow vertical:
   - container raiz: trocar `space-y-3` por `flex flex-col gap-3 h-[calc(100vh-220px)] overflow-hidden`.
   - assim, a área dos filtros fica fixa no topo e o kanban abaixo nunca empurra a página.
2. Fazer o container do kanban (linha 451) ocupar o restante da altura e ter apenas overflow horizontal:
   - de `flex gap-3 overflow-x-auto scrollbar-thin pb-3`
   - para `flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-thin pb-2 flex-1 min-h-0`.
3. Ajustar a coluna (`Coluna`, linha 238) para esticar verticalmente dentro desse container e deixar o scroll dos cards consumir o espaço restante:
   - raiz da coluna: trocar `flex flex-col` por `flex flex-col h-full`.
   - área de cards (linha 253): trocar `overflow-y-auto scrollbar-thin pr-1 max-h-[calc(100vh-260px)] min-h-[100px]` por `overflow-y-auto scrollbar-thin pr-1 flex-1 min-h-0`.

Resultado: a aba Posts cabe inteira na viewport, o `<main>` não precisa scrollar, e cada status mantém seu próprio scroll vertical de cards. As demais abas continuam intactas (a alteração é local ao componente Posts).

## Fora de escopo
- Não alterar `AppLayout.tsx` (o `overflow-auto` global continua útil para outras abas/páginas).
- Não mexer em paginação, filtros, drag-and-drop, nem visual dos cards.
- Não alterar a barra de rolagem horizontal do kanban.
