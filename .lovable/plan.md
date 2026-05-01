## Objetivo

Padronizar o tooltip do badge ⚡ **Tarefas urgentes** (na coluna *Cliente* da tabela em `/clientes`) para exibir os detalhes de cada tarefa, igual ao que já é mostrado no badge ⌛ Tarefas atrasadas. Hoje ele mostra apenas o texto genérico "1 Tarefa urgente".

## Onde

`src/components/clientes/ClientesGeralTable.tsx` — bloco do indicador `demUrgentes` (linhas 289–291 e 409–421).

## O que muda

1. Substituir o cálculo simples por uma **lista** ordenada (mais antigas primeiro), espelhando a lógica de `demAtrasadasList`:

   ```ts
   const demUrgentesList = demandasCli
     .filter((d) => d.prioridade === "Urgente")
     .sort((a, b) => {
       const da = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
       const db = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
       return da - db;
     });
   const demUrgentes = demUrgentesList.length;
   ```

2. Reescrever o `<TooltipContent>` do badge ⚡ usando exatamente o mesmo layout do badge ⌛:
   - `side="bottom" align="start"` e `className="max-w-[420px] min-w-[280px] p-0"`.
   - Cabeçalho: `"{n} tarefa(s) urgente(s)"`.
   - Lista com até 5 itens, cada um exibindo:
     - **Título** (`line-clamp-2 break-words`).
     - **Categoria**: `CATEGORIA_LABEL[d.categoria] ?? "Outro"`.
     - **Prazo**: `data_limite` formatado `dd/MM/yyyy` (`pt-BR`); se `null`, `"sem prazo"`.
     - **Responsável**: primeiro nome via `getResponsaveisIds(d)` cruzado com `responsaveis`. Mais de 1 → `"Nome +N"`. Nenhum → linha omitida.
   - Rodapé `"+ {n - 5} tarefa(s) urgente(s)"` se a lista exceder 5.
   - Mesmas classes/tokens semânticos (`text-muted-foreground`, `border-border/60`) usados no tooltip de atrasadas — sem cores hardcoded.

## O que **não** muda

- Lógica de criação/contagem de tarefas urgentes (badge segue mostrando apenas o número).
- Tooltip de atrasadas, posts, contrato e onboarding.
- Filtros, ordenação e Projeto Completo.

## Validação manual

- Cliente com 1 tarefa urgente → cabeçalho singular + 1 item completo.
- Cliente com 7 urgentes → 5 itens + rodapé `+ 2 tarefas urgentes`.
- Tarefa urgente sem prazo → exibe `"sem prazo"`.
- Tarefa urgente sem responsável → linha de responsável omitida.
- Cliente que tem urgente **e** atrasada → ambos badges abrem tooltips estruturados e equivalentes.

## Versão

Bump em `public/version.json`.