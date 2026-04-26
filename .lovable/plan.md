## Objetivo
Reduzir a altura das linhas da tabela no painel **Clientes** do módulo **Demandas**, sem alterar layout, colunas ou funcionalidade.

## Diagnóstico
A tabela em `src/components/demandas/ClientesDemandasTable.tsx` já tem `[&_td]:py-1.5`, mas a altura permanece alta porque:
- Botão "Abrir" usa `size="sm"` (~36px), esticando a linha.
- Badges de Atrasadas/Urgentes têm altura padrão.
- AvatarStack `size="sm"` adiciona altura.

## Mudanças (apenas `src/components/demandas/ClientesDemandasTable.tsx`)

1. **Padding vertical**: trocar `[&_th]:py-2 [&_td]:py-1.5` por `[&_th]:py-1 [&_td]:py-0.5` (mantém `px-2`).
2. **Botão "Abrir"**: remover `size="sm"`, adicionar `className="h-6 px-2 text-xs"`.
3. **Badges (Atrasadas/Urgentes)**: adicionar `h-5 px-1.5 text-xs`.
4. **AvatarStack**: trocar `size="sm"` por `size="xs"` se suportado; caso contrário, manter `sm`.

## Não alterado
- Colunas, ordenação, filtros, navegação por clique.
- Tokens semânticos de cor e estrutura geral da página.

## Verificação
Linhas ficarão ~40–50% mais baixas, mantendo legibilidade e o mesmo visual.