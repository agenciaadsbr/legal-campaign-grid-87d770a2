## Diagnóstico

Observação: o screenshot enviado é da rota `/clientes` (módulo antigo), não da subaba "Clientes" dentro de `/demandas`. Como você está atualmente em `/demandas` e mencionou explicitamente "painel clientes no módulo demandas", vou tratar a subaba **Demandas → Clientes** (`ClientesDemandasTable.tsx` + wrapper em `Demandas.tsx`).

Pontos de espaço excessivo identificados:

1. **Wrapper da página** (`Demandas.tsx`): `p-6 space-y-4` — padding lateral e vertical grandes.
2. **Dois cards de filtro empilhados**: o card de filtros global de Demandas (linhas 116–173) + o card de filtros local dentro de `ClientesDemandasTable` (linhas 87–135) → duplicação visual com gap entre eles.
3. **Gap entre filtros e tabela** dentro de `ClientesDemandasTable`: `space-y-3`.
4. **`TabsContent` mt-4** entre as abas e o conteúdo.
5. **Padding interno do header/título**: `space-y-4` entre header, filtros e tabs.
6. **Linhas da tabela**: `TableCell` padrão tem `p-4` (vertical generoso).

## Mudanças propostas

### `src/pages/Demandas.tsx`
- Trocar wrapper: `p-6 space-y-4` → `p-3 space-y-2`.
- Reduzir gap do header: o bloco `flex items-start justify-between gap-4` → `gap-2` e remover margem do parágrafo descritivo (ou deixá-lo mais compacto: `text-xs`).
- Card de filtros global: `CardContent p-3 ... gap-2` → `p-2 gap-1.5`.
- `TabsContent` (todos os 6): `mt-4` → `mt-2`.

### `src/components/demandas/ClientesDemandasTable.tsx`
- Wrapper externo: `space-y-3` → `space-y-1.5`.
- Card de filtros local: `CardContent p-3 ... gap-2` → `p-2 gap-1.5`. Inputs/Selects já têm `h-9`, manter.
- **Tabela compacta**: adicionar classe `[&_td]:py-1.5 [&_th]:py-2 [&_td]:px-2 [&_th]:px-2` no `<Table>` para reduzir 90% do padding vertical das linhas.
- Mensagem vazia: `p-8` → `p-3`.

### Resultado esperado
- Header → filtros: gap mínimo (~6px em vez de 16px).
- Filtros → tabs: gap mínimo.
- Tabs → tabela: gap mínimo.
- Linhas da tabela ~50% mais baixas (densidade de planilha).
- Padding lateral da página reduzido para aproveitar a largura.

### Não alterado
- Lógica, dados, ordem das colunas, componentes `Avatar`, `Badge`, navegação.
- Demais abas (Quadro Geral, Minhas Demandas, etc.) recebem apenas o ajuste do wrapper/tabs (proporcional, não destrutivo).
- Tokens semânticos de cor (mantidos conforme memória do projeto).

Após aprovação, aplico as edições nos 2 arquivos acima.