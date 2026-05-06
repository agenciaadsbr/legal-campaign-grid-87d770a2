## Problema

Ao clicar no ícone de "abrir em nova aba" (ExternalLink) em **Minhas Tarefas**, o usuário é levado para `/clientes/:id/projeto?tab=...&demanda=:id`, o que abre o componente `DemandaDetalheDialog`. Esse dialog está hoje com:

- `max-w-3xl` (768px) — muito largo
- `max-h-[85vh]` (~85% da altura da viewport) — muito alto
- `overflow-y-auto` no próprio container — gera rolagem interna em telas padrão
- Padding herdado do `DialogContent` base (`p-6`) + padding adicional (`p-4 md:p-5`) = espaçamento exagerado

Resultado: em viewports comuns (1366×768, 1498×861) o formulário ocupa quase toda a tela e ainda precisa rolar.

## Correção

Editar **um único arquivo** — `src/components/demandas/DemandaDetalheDialog.tsx`, linha 240:

**Antes:**
```tsx
<DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 md:p-5">
```

**Depois:**
```tsx
<DialogContent className="max-w-2xl w-[92vw] max-h-[78vh] overflow-y-auto p-4">
```

Mudanças:
- `max-w-3xl` → `max-w-2xl` (768px → 672px) + `w-[92vw]` para responsividade em telas menores
- `max-h-[85vh]` → `max-h-[78vh]` deixa respiro acima/abaixo
- `p-4 md:p-5` → `p-4` (padding consistente e mais enxuto)
- `overflow-y-auto` mantido como segurança caso o conteúdo cresça (ainda assim, com layout mais compacto não deverá haver rolagem em fluxos típicos)

Adicionalmente, para garantir compactação interna, reduzir espaçamentos do `CardContent` (linha 372):

**Antes:**
```tsx
<CardContent className="space-y-5">
```
**Depois:**
```tsx
<CardContent className="space-y-3">
```

E o `CardHeader` (linha 248):

**Antes:**
```tsx
<CardHeader className="pb-3">
```
**Depois:**
```tsx
<CardHeader className="pb-2 pt-3 px-4">
```

## Resultado esperado

- Dialog abre em ~672px de largura, centralizado, com altura natural ao conteúdo
- Em viewports a partir de 1366×768 não há rolagem para os campos principais
- Mantém responsividade em mobile via `w-[92vw]`
- Nenhuma mudança de comportamento, apenas dimensionamento

## Arquivo afetado

- `src/components/demandas/DemandaDetalheDialog.tsx` (3 pequenas alterações de className)
