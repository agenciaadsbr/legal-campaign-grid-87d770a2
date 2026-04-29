## Objetivo
Otimizar o kanban da aba **Posts** (`PostsKanbanCliente.tsx`) para:
1. Reduzir o tamanho/espaçamento dos cards (visual mais compacto, parecido com o screenshot).
2. Limitar a exibição a **8 cards por coluna** com paginação.
3. Adicionar **scroll interno em cada coluna** (altura fixa) para a página principal não rolar tanto.
4. Manter todas as informações atuais (título, "Post Mês X · Semana Y", prazo, avatares, urgência, badge de status, botão "Iniciar tarefa").

## Mudanças em `src/components/clientes/PostsKanbanCliente.tsx`

### 1. Card mais compacto (`CardItem`)
- Padding `p-3` → `p-2.5`, `mb-2` → `mb-1.5`.
- Título: manter `text-sm` mas `line-clamp-2` (já é) e reduzir gap interno (`gap-1.5` mantido).
- Subtítulo "Post Mês … · Semana …": `text-[10px]` mantido, `mt-0.5` → `mt-1` (respiro mínimo) e `text-muted-foreground`.
- Linha prazo + avatares: `mt-2` → `mt-1.5`.
- Botão "Iniciar tarefa": `mt-2 h-7` → `mt-1.5 h-7` (mantém clicabilidade).
- Badge de status (quando não-Planejamento): `mt-2` → `mt-1.5`.
- Resultado: cards visualmente próximos ao screenshot enviado, com menos espaço vertical desperdiçado.

### 2. Coluna com altura fixa + scroll interno (`Coluna`)
- Trocar `min-w-[260px]` por `w-[270px] shrink-0` para colunas de largura consistente (igual ao screenshot).
- Wrapper interno da lista (`<div className="min-h-[100px]">`) substituído por um container com:
  - Altura máxima fixa: `max-h-[calc(100vh-260px)]` (ajusta ao header/filtros).
  - `overflow-y-auto scrollbar-thin pr-1` para barra de rolagem própria.
- Adicionar contador "X de Y" ao lado do `StatusBadge` quando houver paginação.

### 3. Paginação de 8 cards por coluna
- Estado local `paginas: Record<StatusCard, number>` no componente `PostsKanbanCliente` (default 1 por coluna).
- Constante `CARDS_POR_PAGINA = 8`.
- Em `Coluna`, receber props `pagina`, `onPaginaChange` e `total`. Calcular `slice((pagina-1)*8, pagina*8)`.
- Rodapé da coluna (dentro do scroll-area, sticky no final ou logo abaixo da lista): controles compactos
  - `‹  Página X / N  ›` usando `Button variant="ghost" size="icon" className="h-6 w-6"`.
  - Só renderizar se `total > 8`.
- Reset da página da coluna para 1 quando filtros mudarem (`useEffect` que zera `paginas` ao mudar `filtroMes/filtroResps/filtroSomente/busca`).

### 4. Drop-zone permanece funcional
- O `useDroppable` continua na raiz da `Coluna`; o `overflow-y-auto` é em um filho, então o drop dentro da área visível segue funcionando. Não muda a lógica de DnD.

## Detalhes técnicos
- `CARDS_POR_PAGINA = 8` declarado no topo do arquivo.
- `paginas` tipado `Partial<Record<string, number>>` (status como string para evitar fricção de tipos).
- Helper `getPagina(status)` retorna `paginas[status] ?? 1`.
- Ao paginar, o scroll interno volta ao topo via `ref` no container scrollável (opcional; `scrollTop=0` no callback de mudança de página).
- Manter classes `scrollbar-thin` (já usada no arquivo).

## Fora de escopo
- Não alterar `ProjetoKanban` (Demandas) nem outros kanbans.
- Não alterar dados nem store.
