## Objetivo

Reduzir tamanhos de texto, paddings, espaçamentos e altura de linhas do módulo **Minhas Tarefas** para ficar visualmente consistente com **Clientes** (que usa container `px-5 py-4 space-y-3`, título `text-xl`, controles `h-8 text-xs` e tabela densa com `[&_th]:h-7 [&_td]:py-1`).

## Mudanças

### 1. `src/pages/MinhasTarefas.tsx` — Container, header e KPIs

- Container: trocar `p-6 space-y-5` por `px-5 py-4 space-y-3` (igual a Clientes).
- Header:
  - `<h1>` de `text-2xl font-bold tracking-tight` → `text-xl font-bold leading-tight`.
  - `<p>` subtítulo de `text-sm` → `text-xs`.
  - Aviso âmbar de "usuário não vinculado": reduzir `p-3 text-sm` → `p-2 text-xs`.
- Bloco de KPIs: trocar `gap-3` → `gap-2` e adicionar variante compacta (ver item 2).

### 2. `src/components/relatorios/KpiCard.tsx` — adicionar prop opcional `compact`

- Adicionar `compact?: boolean` (default `false`, preservando uso atual em outros relatórios).
- Quando `compact`:
  - `CardContent` `p-4` → `p-3`.
  - Label `text-[11px]` mantém, mas `mt-1.5 text-3xl` → `mt-1 text-2xl`.
  - Ícone container `h-10 w-10` → `h-8 w-8`, ícone `h-5 w-5` → `h-4 w-4`.
- Em `MinhasTarefas.tsx`, passar `compact` nos 4 `KpiCard`.

### 3. `src/components/tarefas/MinhasTarefasFiltros.tsx` — barra de filtros mais baixa

- Trocar todos os `h-9` por `h-8` (Input busca, SelectTrigger cliente, botões Área / Status / Limpar).
- Input busca: `pl-8` mantido; adicionar `text-xs` e ajustar ícone para `h-3.5 w-3.5`.
- Botões Área/Status: já usam `size="sm"`, ajustar para `text-xs` e ícone `h-3.5 w-3.5`.
- `gap-2` mantido.
- Garantir que `PeriodoFiltro` se alinhe (usa `h-8` por padrão — não alterar o componente).

### 4. `src/components/tarefas/MinhasTarefasTabela.tsx` — tabela densa estilo Clientes

- Container `rounded-md border border-border bg-card`: substituir por um `<Card><CardContent className="p-0">` (mesmo wrapper de `ClientesGeralTable`) para herdar visual.
- Adicionar classes de densidade na `<Table>`:
  ```
  className="[&_th]:py-1 [&_th]:px-2 [&_th]:h-7 [&_th]:text-xs [&_td]:py-1 [&_td]:px-2"
  ```
- Reduzir larguras de coluna fixas:
  - Cliente `w-[180px]` → `w-[160px]`
  - Área `w-[160px]` → `w-[120px]`
  - Prioridade `w-[110px]` → `w-[90px]`
  - Prazo `w-[110px]` → `w-[90px]`
  - Status `w-[130px]` → `w-[110px]`
  - Ações `w-[160px]` → `w-[120px]`
- Cells: textos `text-sm` → `text-xs` (Cliente, título da Tarefa). `text-xs` que já existem ficam.
- Botões da coluna Ações: `h-8` → `h-7`, padding `px-2`, texto `text-xs`. Ícones `h-3.5 w-3.5` mantidos.
- Estado vazio (`p-12`) → `p-6`, ícone `h-10 w-10` → `h-8 w-8`, título `text-sm` → `text-xs font-medium`.

### 5. `public/version.json`

- Bump para invalidar cache.

## Resultado esperado

- Header, filtros, KPIs e tabela com a mesma densidade compacta da página **Clientes**.
- Sem alterações funcionais — apenas estilo/espacamento.
- `KpiCard` continua compatível com `Dashboard` e `Relatorios` (a flag `compact` é opt-in).
