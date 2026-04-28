## Problema

Na aba **Clientes** do módulo Demandas, ao passar o mouse sobre os badges **Atrasadas** (vermelho) e **Urgentes** (roxo), o usuário vê apenas um "ponto de interrogação" — que na verdade é o cursor `cursor-help` do navegador (uma seta com `?`). O conteúdo do tooltip em si **não aparece**.

## Causa raiz

O componente `src/components/ui/tooltip.tsx` deste projeto **não envolve** o `TooltipPrimitive.Content` em um `TooltipPrimitive.Portal`. Sem portal, o conteúdo do tooltip é renderizado dentro da célula da tabela (`<td>`), onde restrições de layout/overflow da `<table>` o tornam invisível. Para comparação, `src/components/ui/popover.tsx` já usa `PopoverPrimitive.Portal` corretamente.

A própria sessão antiga mostrou os tooltips funcionando em alguns hovers, mas o comportamento é instável justamente por não estar portado.

## Correção

Editar `src/components/ui/tooltip.tsx` para envolver o `TooltipPrimitive.Content` em `TooltipPrimitive.Portal`, exatamente no mesmo padrão já usado pelo `popover.tsx`:

```tsx
<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={...} {...props} />
</TooltipPrimitive.Portal>
```

Isso renderiza o conteúdo no `document.body`, escapando do clipping da tabela, e o tooltip ficará visível em todos os usos do projeto (não só nos badges de Demandas).

## Fora de escopo

- Não alterar `ClientesDemandasTable.tsx` (a lógica e o conteúdo do tooltip já estão corretos).
- Não modificar outros tooltips/componentes UI.
