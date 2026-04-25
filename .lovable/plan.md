# Otimização de densidade — Página Clientes

Reduzir espaços e tamanhos de texto na página `/clientes` para diminuir a rolagem vertical e aproximar o visual da imagem de referência (alta densidade, profissional).

## Alterações em `src/pages/Clientes.tsx`

### 1. Cabeçalho da página
- Padding geral: `p-6` → `px-5 py-4`
- Título: `text-2xl` → `text-xl`
- Subtítulo/descrição: reduzir para `text-xs`
- Barra de busca: largura mais compacta, `h-9` → `h-8`, `text-sm` mantido

### 2. Cabeçalho da tabela (`<th>`)
- Padding vertical: `py-2.5` → `py-1.5`
- Fonte: `text-xs` → `text-[11px]`, manter `uppercase tracking-wide`
- Altura geral mais compacta

### 3. Linhas da tabela (`<td>`)
- Padding vertical: `py-2` → `py-1.5`
- Padding horizontal mantido (`px-3`)
- Fonte base das células: `text-sm` → `text-xs`

### 4. Cabeçalhos de grupo de status
- Reduzir padding (`py-2` → `py-1`)
- Chevron: `h-4 w-4` → `h-3.5 w-3.5`
- Fonte: `text-xs font-medium`

### 5. Componente `CelulaValor` — ajustes por tipo de coluna
- **`periodo_contrato`**: valor `text-xs`, micro-labels (Início/Fim) `text-[9px]`
- **`posts`**: linha principal `text-xs font-medium`, secundária `text-[11px] text-muted-foreground`
- **`ultimo_comentario`**: `text-xs`, truncar com `line-clamp-1`
- **`data` / `link` / texto livre**: padronizar em `text-xs`
- **Badges de status**: `text-[11px]`, `px-2 py-0.5`

### 6. Container da tabela
- Aumentar `max-h` para mostrar mais linhas sem rolagem dupla
- Garantir `scrollbar-thin` no overflow

## Não alterar
- Lógica de filtros, agrupamento por status, drag-and-drop de colunas
- Store (`src/store/crm.ts`)
- Outras páginas

## Resultado esperado
Mais linhas visíveis no viewport (~30-40% mais densidade), tipografia consistente com referência, sem perda de legibilidade.
