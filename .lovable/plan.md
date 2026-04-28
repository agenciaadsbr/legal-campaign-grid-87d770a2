## Objetivo

Adicionar tooltips informativos nas colunas **Total** e **Responsáveis das Demandas** da aba "Clientes" do módulo Demandas. Os tooltips das colunas **Atrasadas** e **Urgentes** já existem e funcionam — serão mantidos como estão.

## Escopo

Editar apenas `src/components/demandas/ClientesDemandasTable.tsx`. Sem mudanças no backend, store, ou contadores.

## Mudanças

### 1. Agregar dados extras por cliente (no `useMemo`)

Estender o objeto agregador para também guardar:
- `todasDemandas: Demanda[]` — todas as demandas filtradas do cliente
- `demandasPorResponsavel: Map<string, Demanda[]>` — demandas atribuídas a cada responsável

Preenchido no mesmo loop `filtradas.forEach((d) => …)` que já existe.

### 2. Tooltip na coluna "Total"

Envolver o número total em `<Tooltip>`:
- Trigger: o `<span>` com o número (cursor-help, stopPropagation no clique).
- Content: lista resumida usando o componente `DemandasTooltipList` já existente, com nova `variant="total"` (borda neutra `border-border`).
- Título: `"X demanda cadastrada"` ou `"X demandas cadastradas"`.
- Se `total === 0`: não renderizar tooltip (mantém o número simples).

### 3. Tooltip nos avatares dos responsáveis

Substituir o `AvatarStack` simples por uma versão envolvendo cada avatar em um `Tooltip` individual:
- Criar um wrapper local `ResponsaveisComTooltip` que renderiza avatares (mantendo o estilo "stack" via classes negativas de margem) e, em cada um, anexa um Tooltip com:
  - Nome completo do responsável.
  - Quantidade de demandas atribuídas a ele naquele cliente (`X demanda atribuída` / `X demandas atribuídas`).
- Manter o limite visual `max={4}` com indicador `+N` (também com tooltip listando os nomes restantes).

### 4. Reuso e consistência

- Continuar usando `TooltipProvider delayDuration={150}` que já envolve a tabela.
- `TooltipContent` com `side="left"` (ou `top` para Total, evitando cortar pela borda direita) e `className="p-3"`.
- Limite de 6 itens na lista (já implementado via `DemandasTooltipList`), com sufixo "… e mais N".

## Fora de escopo

- Coluna Atrasadas/Urgentes (já funcionando).
- Ícones de alerta extras / "sem responsável" / "sem prazo" — não há badges desses na tabela atual; podem ser adicionados em ticket separado se solicitado.
- Mobile/touch: o Radix Tooltip já suporta foco/touch básico; sem ajustes adicionais.

## Validação

- Cliente com Total=2/Atrasadas=1/Urgentes=1: hover em Total mostra as 2; Atrasadas mostra 1; Urgentes mostra 1.
- Cliente sem demandas: número "0" sem tooltip.
- Hover em avatar: mostra nome + contagem do responsável naquele cliente.
