## Otimização visual — Central de Reuniões

Reduzir o excesso de espaço vertical e padronizar a densidade da página `/central-reunioes` com o padrão visual já usado em `Clientes` (`src/pages/Clientes.tsx`). Apenas mudanças de UI/layout em `src/pages/CentralReunioes.tsx` — sem alterar lógica, filtros, stores, dialogs ou comportamento.

### Padrão de referência (Clientes)

- Wrapper da página: `px-5 py-4 space-y-3 animate-fade-in` (hoje em Reuniões: `p-6 space-y-5`)
- Título: `text-xl font-bold leading-tight` + linha de contexto `text-xs text-muted-foreground` (hoje: `text-2xl font-semibold` + `text-sm`)
- Controles no header: inline, altura `h-8`, texto `text-xs`, gap pequeno
- Sem "Card de filtros" separado — filtros ficam compactos no topo

### Mudanças em `src/pages/CentralReunioes.tsx`

1. **Wrapper e header**
   - Trocar `p-6 space-y-5` por `px-5 py-4 space-y-3 animate-fade-in`.
   - Reduzir título para `text-xl font-bold leading-tight`; subtítulo `text-xs text-muted-foreground` mostrando contagem (ex.: `42 reuniões · 5 pendentes`).
   - Botão "Nova Reunião" como `size="sm"` com `h-8`, ícone menor.

2. **Widgets de status (linha compacta única)**
   - Substituir os 6 `Card` grandes por uma faixa horizontal única (`flex flex-wrap gap-2`) de "chips" clicáveis baseados em `Button`/`div` compactos (altura ~h-9, padding `px-3 py-1.5`).
   - Cada chip mostra label em `text-[10px] uppercase` e número em `text-sm font-bold` lado a lado (não empilhado), aproveitando largura.
   - Manter cores semânticas atuais (âmbar para Pendentes, etc.) só nas bordas/fundo sutil.
   - Resultado: 1 linha ao invés de bloco de cards ocupando ~120px.

3. **Filtros**
   - Remover o `Card` ao redor do bloco de filtros.
   - Manter o mesmo grid mas em uma linha (`flex flex-wrap gap-2`) com todos os controles a `h-8` e `text-xs`, igual aos filtros de Clientes.
   - Busca: largura `w-[240px]`; selects `w-[140px]–[160px]`; datas `w-[130px]`.

4. **Tabela**
   - Manter o `Card` da tabela (mesmo padrão de outras telas do projeto).
   - Reduzir padding das células de `p-2` para `px-2 py-1.5` e fontes de cabeçalho/células já estão pequenas — manter.
   - Header da tabela permanece sticky/compacto.

5. **Paginação / rodapé**
   - Garantir que o controle de paginação fique compacto (`h-8`, `text-xs`).

### Não escopo (não alterar)

- Stores (`useReunioes`, `useMeetingTasks`, `useCRM`), filtros, contagens, lógica `isCritica`/`isAlerta`.
- Dialogs (`ReuniaoDialog`, `DelegarTarefasDialog`, AlertDialogs de "não realizada" / "sem ação").
- Ações do dropdown da tabela.
- Rotas, sidebar, migrations.

### Resultado esperado

Página inicial visível em ~1 viewport para listas pequenas/médias; widgets em 1 linha; filtros em 1 linha; tabela imediatamente visível abaixo, sem necessidade de rolagem para chegar nela — mesmo nível de densidade da página `Clientes`.