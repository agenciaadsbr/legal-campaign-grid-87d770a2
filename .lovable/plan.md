## Diagnóstico do erro anterior

A barra que o usuário marcou em vermelho na imagem é a **barra de rolagem do `<main>` do AppLayout** (lateral direita da viewport, do topo ao fim da área de conteúdo). Não é a barra interna das colunas.

Na tentativa anterior eu tentei resolver isso travando o `PostsKanbanCliente` em `h-[calc(100vh-220px)] overflow-hidden`. Isso não funcionou porque:
- O `<main className="flex-1 min-w-0 overflow-auto">` (em `src/components/AppLayout.tsx`, linha 84) continua medindo o conteúdo total (breadcrumb + header da página + Tabs + filtros + kanban) e, como esse total ultrapassa a viewport por alguns pixels, ele renderiza a barra.
- O cálculo `100vh-220px` é frágil; qualquer alteração de header/tabs (ex.: quebra de linha em tela menor) recria o overflow.
- Pior: ao tornar a área dos cards `flex-1 min-h-0`, a barra interna de cada coluna acabou sumindo visualmente nas colunas com poucos cards (porque a altura disponível ficou maior que o conteúdo). A barra que eu deveria ter preservado era essa interna.

## Objetivo (corrigido)

Na aba **Posts**:
- Eliminar a barra de rolagem vertical da página inteira (a do `<main>`, lateral direita da viewport — a marcada com seta vermelha).
- Manter a barra horizontal embaixo do kanban.
- Manter a barra interna vertical de cada coluna de status quando ela tiver cards suficientes.

Demais abas (`visao`, `videos`, `trafego`, `lp`, `ia`, `documentacao`, `briefing`, `planejamento`, `atividades`, `responsaveis`, `relatorios`) precisam continuar com o scroll de página normal — não podemos travar o `<main>` globalmente.

## Mudanças

### 1) `src/components/AppLayout.tsx`

Tornar o `<main>` um flex container que pode hospedar tanto páginas com scroll próprio quanto páginas que controlam a altura por conta própria. Mais simples: deixar `overflow-auto` apenas quando o conteúdo precisar; aqui vamos manter `overflow-auto` (não quebra nenhuma outra página) mas também adicionar `flex flex-col` para que o filho possa esticar usando `h-full` quando quiser:

- linha 84: trocar
  - de: `<main className="flex-1 min-w-0 overflow-auto">`
  - para: `<main className="flex-1 min-w-0 overflow-auto flex flex-col">`

Isso é compatível com o restante das páginas (continuam fluindo normalmente; um filho `flex flex-col` herda layout em bloco quando os filhos usam altura intrínseca).

### 2) `src/pages/ProjetoCliente.tsx`

Tornar o container raiz da página `ProjetoCliente` capaz de ocupar toda a altura disponível quando estamos na aba Posts, sem alterar o comportamento das outras abas.

- linha 164: trocar
  - de: `<div className="p-6 space-y-4 animate-fade-in">`
  - para: `<div className={cn("p-6 space-y-4 animate-fade-in", tab === "posts" && "flex flex-col h-full min-h-0 overflow-hidden")}>`

- na linha 207, dar `flex-1 min-h-0 flex flex-col` ao `<Tabs>` quando `tab === "posts"`:
  - de: `<Tabs value={tab} onValueChange={handleTabChange}>`
  - para: `<Tabs value={tab} onValueChange={handleTabChange} className={cn(tab === "posts" && "flex-1 min-h-0 flex flex-col")}>`

- linha 236: dar à `TabsContent` da aba Posts altura total e ocultar overflow:
  - de: `<TabsContent value="posts" className="mt-4">`
  - para: `<TabsContent value="posts" className="mt-4 flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">`

Resultado: na aba Posts, a página inteira ocupa exatamente a altura da viewport (sem overflow no `<main>`), e o `PostsKanbanCliente` recebe um container pai com altura definida.

### 3) `src/components/clientes/PostsKanbanCliente.tsx`

Reverter o cálculo `100vh-220px` (frágil) e usar `h-full` baseado no novo container pai. Manter o scroll interno das colunas:

- linha 368: trocar
  - de: `<div className="flex flex-col gap-3 h-[calc(100vh-220px)] overflow-hidden">`
  - para: `<div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden">`

- linha 451 (container do kanban): manter `flex-1 min-h-0 overflow-x-auto overflow-y-hidden` (já está correto após o ajuste anterior).

- linha 238 (raiz da `Coluna`): manter `flex flex-col h-full` (já está correto).

- linha 253 (área de cards da coluna): atualmente `overflow-y-auto scrollbar-thin pr-1 flex-1 min-h-0`. Para garantir que a barra **interna** apareça quando há cards suficientes (ela é a "barra correta" que precisa permanecer), voltar a aplicar um teto de altura para que, mesmo com poucos cards em uma coluna específica, a presença/ausência da barra interna fique consistente com o conteúdo:
  - manter como está: `overflow-y-auto scrollbar-thin pr-1 flex-1 min-h-0`. Com a página agora travada na altura da viewport, a barra interna passa a aparecer somente quando os cards realmente excederem a altura — exatamente o comportamento esperado.

## Verificação manual após implementação

1. Aba `Posts`: a barra de rolagem vertical à direita da viewport (a marcada em vermelho) **não deve mais existir**. A barra horizontal embaixo do kanban deve continuar. Cada coluna com mais cards do que cabe na altura deve mostrar sua própria barra de rolagem interna.
2. Demais abas (`Visão Geral`, `Vídeos`, `Tráfego Pago`, etc.): o scroll vertical da página deve funcionar normalmente quando o conteúdo for maior que a viewport.
3. Sidebar recolhida/expandida e tema claro/escuro: comportamento idêntico.

## Fora de escopo

- Drag-and-drop, paginação, filtros, layout dos cards.
- Demais abas do `ProjetoCliente`.
- `AppSidebar` e `AppLayout` além do ajuste mínimo descrito.
