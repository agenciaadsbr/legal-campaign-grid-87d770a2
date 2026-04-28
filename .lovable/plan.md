## Objetivo

No módulo **Demandas**, aba **Clientes**, ao passar o mouse sobre os badges vermelhos **Atrasadas** e roxo **Urgentes** de cada linha, exibir um tooltip com a lista detalhada das demandas correspondentes daquele cliente.

## O que será exibido no tooltip

Para cada demanda (atrasada ou urgente) do cliente, mostrar:
- Título da demanda
- Categoria / subtipo
- Status atual
- Data limite formatada (dd/mm/aa) — destacada se vencida
- Responsáveis (nomes)

Cabeçalho do tooltip: "X demanda(s) atrasada(s)" ou "X demanda(s) urgente(s)".

Se a lista for longa (>6 itens), mostrar os 6 primeiros + "… e mais N".

## Implementação técnica

Arquivo: `src/components/demandas/ClientesDemandasTable.tsx`

1. Já agregamos `total/atrasadas/urgentes` por cliente. Estender o agregador para guardar também as **listas** das demandas relevantes:
   - `demandasAtrasadas: Demanda[]`
   - `demandasUrgentes: Demanda[]`

2. Envolver os badges de **Atrasadas** e **Urgentes** com `Tooltip` / `TooltipTrigger` / `TooltipContent` (de `@/components/ui/tooltip`, já existente no projeto). Garantir `TooltipProvider` no escopo (envolver a tabela com um único `TooltipProvider delayDuration={150}`).

3. Conteúdo do tooltip renderizado como uma pequena lista compacta usando tokens semânticos (`bg-popover`, `text-popover-foreground`, `border-border`) — sem cores hardcoded, respeitando o tema dark azul-escuro do projeto.

4. `e.stopPropagation()` no trigger para evitar conflito com o `onClick` da linha (navegação).

5. Quando `atrasadas === 0` ou `urgentes === 0`, manter o "0" atual sem tooltip.

## Fora de escopo

- Não alterar lógica de filtros, navegação, ou estilos das demais colunas.
- Não criar nova página ou rota.
