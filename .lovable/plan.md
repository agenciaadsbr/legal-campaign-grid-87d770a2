## Objetivo

Na aba **Posts** dentro de `Projeto Completo`, eliminar a barra de rolagem horizontal global da página, eliminar a faixa "vazia" à direita do kanban e fazer o kanban ocupar 100% da largura útil da tela. O scroll horizontal só pode existir **dentro** do próprio kanban (quando as 11 colunas não cabem) e o scroll vertical só pode existir **dentro** de cada coluna — nunca na página.

## Diagnóstico

1. `src/components/AppLayout.tsx` (linha 84): `<main class="flex-1 min-w-0 overflow-auto">` permite scroll horizontal a nível de página caso qualquer filho estoure a largura. Isso explica a barra horizontal global quando o kanban (≈ 11 × 270px ≈ 3000px) é renderizado. Embora o kanban use `overflow-x-auto`, qualquer outro elemento (TabsList com `inline-flex w-max`, breadcrumb, etc.) também pode contribuir.
2. `src/pages/ProjetoCliente.tsx` (linha 164): o container raiz da página usa `p-6 space-y-4` sem `min-w-0` nem `overflow-x-hidden`. A combinação `padding lateral 24px` + filhos largos (kanban) gera a faixa branca lateral à direita: o kanban respeita o `p-6` e pára antes da borda da tela.
3. `src/components/clientes/PostsKanbanCliente.tsx` (linha 368): o wrapper `h-[calc(100vh-220px)]` está correto para travar a altura, mas não trata da largura. Quando o kanban sai da aba, a aba `Posts` herda o `p-6` do pai → kanban com 24px de "ar" à direita.

## Mudanças propostas

### 1) `src/components/AppLayout.tsx`
- Linha 84: trocar `<main className="flex-1 min-w-0 overflow-auto">` por `<main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">`.
  - Mantém scroll vertical da página (necessário para abas longas como Visão Geral, Documentação, etc.) e elimina **toda** possibilidade de scroll horizontal global.

### 2) `src/pages/ProjetoCliente.tsx`
- Linha 164: trocar a `<div className="p-6 space-y-4 animate-fade-in">` por `<div className="p-6 space-y-4 animate-fade-in min-w-0">` para garantir que o container nunca empurre o `<main>`.
- Linha 236 (`TabsContent value="posts"`): trocar `className="mt-4"` por `className="mt-4 -mx-6 px-6"` (negative margin lateral) **OU**, alternativa mais simples e que prefiro: deixar o `TabsContent` em `mt-4` e mover a compensação de padding para dentro do `PostsKanbanCliente` (item 3) — assim o ajuste fica isolado da aba Posts e não impacta as outras abas.

### 3) `src/components/clientes/PostsKanbanCliente.tsx`
- Linha 367-368: trocar
  ```
  <div className="flex flex-col gap-3 h-[calc(100vh-220px)] overflow-hidden">
  ```
  por
  ```
  <div className="flex flex-col gap-3 h-[calc(100vh-220px)] overflow-hidden -mx-6 px-6 w-[calc(100%+3rem)]">
  ```
  - O `-mx-6` "desfaz" o `p-6` da página somente para a aba Posts.
  - O `px-6` reaplica o padding internamente para que filtros e kanban não fiquem colados na borda absoluta.
  - O `w-[calc(100%+3rem)]` garante que o wrapper realmente preencha 100% da viewport útil.
  - Resultado: o kanban se estende até as bordas reais da área de conteúdo, sem "faixa branca" à direita.
- Linha 451: manter `flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-thin pb-2 flex-1 min-h-0`. Esse é o **único** lugar com scroll horizontal — exatamente o comportamento desejado (estilo MeisterTask).
- Linhas 234-242 (`Coluna`): manter `w-[270px] shrink-0 ... flex flex-col h-full`. Já está correto: largura fixa, não encolhe, ocupa altura total e tem `overflow-y-auto` interno na lista de cards.

## Resultado visual

- **Página**: sem barra horizontal. Scroll vertical da página continua disponível para outras abas.
- **Aba Posts**: kanban encosta nas duas laterais úteis da viewport; nenhuma "área branca" à direita.
- **Scroll horizontal**: existe **apenas** no container do kanban (linha 451 do `PostsKanbanCliente`) quando as 11 colunas não cabem na tela.
- **Scroll vertical**: existe **apenas** dentro de cada coluna (cards), conforme já configurado.
- **Demais abas** (Visão Geral, Vídeos, Tráfego, etc.): inalteradas — só Posts recebe o `-mx-6` compensatório.

## Fora de escopo

- Lógica/estrutura dos cards, posts, filtros, drag-and-drop, paginação e botão "Adicionar Tarefa".
- Demais abas do `ProjetoCliente`.
- Sidebar, header global, breadcrumb.

## Validação

1. Acessar `/clientes/:id/projeto?tab=posts` em viewport 2048px:
   - Sem barra horizontal na página.
   - Kanban ocupa 100% da largura entre sidebar e borda direita; sem faixa branca à direita.
   - Scroll horizontal aparece apenas dentro do kanban (necessário pois 11 × 270px > 2048px).
2. Trocar para a aba `Visão Geral` / `Documentação`:
   - Layout intacto, sem barra horizontal, scroll vertical da página funcional.
3. Reduzir viewport para 1366px:
   - Sem mudança de comportamento; scroll horizontal continua restrito ao kanban.
