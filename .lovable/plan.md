## Objetivo

Tornar o tooltip do badge **⌛ Tarefas atrasadas** (na coluna *Cliente* da tabela em `/clientes`) informativo: mostrar título, categoria, prazo e responsável de cada tarefa atrasada, sem precisar entrar no Projeto Completo.

Os demais alertas (posts atrasados, urgentes, contrato, onboarding) permanecem **inalterados**.

## Onde

`src/components/clientes/ClientesGeralTable.tsx` — bloco do indicador `demAtrasadas` (linhas 344–356).

## O que muda

1. Em vez de só `demAtrasadas` (contagem), passar a usar a **lista** de demandas atrasadas do cliente (já filtrada no `demandasCli`):

   ```ts
   const demAtrasadasList = demandasCli
     .filter((d) => d.status === "Atrasado")
     .sort((a, b) => {
       const da = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
       const db = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
       return da - db; // mais antigas primeiro
     });
   const demAtrasadas = demAtrasadasList.length;
   ```

2. Substituir o `<TooltipContent>` atual por um conteúdo estruturado:

   - **Título**: `"{n} tarefa(s) atrasada(s)"` (já existe).
   - **Lista** das até **5 primeiras** tarefas, cada item mostrando:
     - Título da tarefa (truncado com `line-clamp-2` quando longo).
     - **Categoria**: usando `CATEGORIA_LABEL[d.categoria]` de `@/lib/demandas-categorias` (já cobre Vídeo, Tráfego Pago, Landing Page / Site, IA / Atendimento, Briefing, Planejamento, Suporte, Urgência / Outro). Para `categoria` sem label conhecido, fallback `"Outro"`.
     - **Prazo**: `data_limite` formatado `dd/MM/yyyy` (`pt-BR`); se `null`, exibir `"sem prazo"`.
     - **Responsável**: primeiro nome a partir de `getResponsaveisIds(d)` cruzado com `responsaveis` do `useCRM()`. Se houver mais de 1, exibir `"Nome +N"`. Se nenhum, omitir a linha de responsável.
   - Se `demAtrasadasList.length > 5`, adicionar rodapé:
     `"+ {n - 5} tarefa(s) atrasada(s)"`.

3. Ajustes do `<TooltipContent>`:
   - `className="max-w-[420px] min-w-[280px] p-0"` (sobrescreve o padding default do componente).
   - Conteúdo interno em `div` com `p-3 space-y-2 text-xs`.
   - Usa tokens semânticos do projeto (`bg-popover`, `text-popover-foreground`, `border`) — herdados do `TooltipContent`. Não introduzir cores hardcoded.
   - `side="bottom"` e `align="start"` para não cobrir a linha do cliente.
   - Cada item: `border-b border-border/60 last:border-0 pb-1.5 last:pb-0`.

4. Adicionar import já necessário no topo:
   - `import { CATEGORIA_LABEL } from "@/lib/demandas-categorias";`
   - `import { getResponsaveisIds } from "@/store/demandas";`
   - Buscar `responsaveis` via `useCRM()` (já desestruturado): incluir `responsaveis` na linha 115.

## O que **não** muda

- Lógica do contador (badge continua mostrando apenas o número).
- Tooltip de **posts atrasados** (linhas 331–343).
- Tooltips de **urgentes**, **contrato**, **onboarding**.
- Filtros, ordenação, criação de tarefas e Projeto Completo.

## Mobile

Tooltips do Radix já abrem em foco/touch via `TooltipProvider` existente (`delayDuration={200}`) — sem alteração extra.

## Validação manual

- Cliente com **1** tarefa atrasada → título singular + 1 item completo.
- Cliente com **3** atrasadas → 3 itens listados.
- Cliente com **7** atrasadas → 5 itens + rodapé `+ 2 tarefas atrasadas`.
- Cliente com posts atrasados **e** tarefas atrasadas → ambos badges aparecem; tooltip de posts inalterado.
- Tarefa sem `data_limite` → mostra `"sem prazo"`.
- Tarefa sem responsável → linha de responsável omitida.

## Versão

Bump em `public/version.json`.
