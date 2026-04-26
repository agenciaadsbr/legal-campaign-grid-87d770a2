## Objetivo
Na aba **Clientes** do módulo **Demandas**, exibir os clientes sempre em **ordem alfabética (A → Z)** e **enumerá-los** com um número sequencial (#) na primeira coluna da tabela.

## Alterações em `src/components/demandas/ClientesDemandasTable.tsx`

### 1. Trocar a ordenação da lista
Atualmente a lista é ordenada por `ultimaAtividade` (atividade mais recente primeiro):

```tsx
lista.sort(
  (a, b) => +new Date(b.ultimaAtividade) - +new Date(a.ultimaAtividade),
);
```

Será substituída por ordenação alfabética estável em pt-BR (case/acento insensível):

```tsx
lista.sort((a, b) =>
  a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
);
```

### 2. Adicionar coluna de enumeração (#)
- Adicionar nova coluna `#` como primeira coluna do `<TableHeader>`, com largura compacta e alinhada à esquerda.
- Em cada `<TableRow>`, renderizar o índice `idx + 1` (a partir de `linhas.map((l, idx) => ...)`) como primeira `<TableCell>`, em estilo discreto (`text-xs text-muted-foreground tabular-nums w-10`).
- A numeração reflete a ordem exibida (alfabética) e é recalculada automaticamente quando filtros/busca mudam, mantendo a sequência sempre contígua (1, 2, 3…).

## Não muda
- Nenhum outro arquivo é modificado.
- Filtros globais (responsável, status, prioridade, busca) continuam funcionando exatamente como hoje.
- Nenhuma alteração em banco de dados, store ou edge functions.