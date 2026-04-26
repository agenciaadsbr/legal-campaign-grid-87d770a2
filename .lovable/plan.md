## Diagnóstico
As setas vermelhas na captura apontam para selects da barra de filtros do módulo **Demandas** que estão exibindo seus textos cortados:

- Barra principal (`src/pages/Demandas.tsx`):
  - **Responsável** (`w-40`) → mostra "Todos..."
  - **Categoria** (`w-36`) → mostra "Todas..."
  - **Prioridade** (`w-32`) → mostra "Todas..."
- Sub-barra do painel **Clientes** (`src/components/demandas/ClientesDemandasTable.tsx`):
  - **Prioridade** (`w-36`) → mostra "Todas..."

A causa é a largura fixa pequena demais para acomodar os textos completos ("Todos responsáveis", "Todas categorias", "Todas prioridades").

## Correções

### 1) `src/pages/Demandas.tsx` — barra de filtros principal
Aumentar a largura dos triggers para acomodar o texto completo (mantendo `h-9` e o mesmo estilo visual):

- Cliente: `w-40` → `w-44` (acomoda nomes longos de cliente já que o placeholder é "Todos clientes")
- Responsável: `w-40` → `w-48` (placeholder "Todos responsáveis")
- Categoria: `w-36` → `w-44` (placeholder "Todas categorias")
- Prioridade: `w-32` → `w-44` (placeholder "Todas prioridades")
- Status: `w-32` → `w-40` (placeholder "Todos status")

### 2) `src/components/demandas/ClientesDemandasTable.tsx` — sub-barra Clientes
- Responsável: `w-44` → `w-48`
- Status: `w-36` → `w-40`
- Prioridade: `w-36` → `w-44`

### 3) Defesa adicional
Para garantir que nenhum texto seja cortado mesmo em telas/zooms diferentes, adicionar `whitespace-nowrap` ao `<SelectValue>` via classe no trigger (`[&>span]:truncate-0` não é necessário — basta as larguras acima). Caso a barra fique apertada em viewports menores, o `flex-wrap` do `CardContent` já quebra para a próxima linha.

## Resultado
Todos os títulos dos filtros ("Todos clientes", "Todos responsáveis", "Todas categorias", "Todas prioridades", "Todos status") ficam **completamente visíveis** tanto na barra principal de Demandas quanto na sub-barra do painel Clientes — sem truncamento com reticências.

Nenhuma outra funcionalidade ou layout é alterado.