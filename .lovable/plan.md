## Atualização do painel geral de Clientes

Mantendo o layout em tabela e as colunas que você listou — **Cliente, Status, Responsáveis, Último comentário, Nicho, Período do contrato** — vamos enxugar o que sobra hoje (Posts, Demandas, Observações), trocar o significado da coluna de responsáveis e adicionar três melhorias de uso: indicadores rápidos, filtros mais úteis e ordenação/densidade.

### O que muda visualmente

```text
┌──┬─────────────┬────────┬──────────────┬──────────────────┬──────────┬──────────────────────┬─────┐
│# │ Cliente  ●●●│ Status │ Responsáveis │ Último comentário│ Nicho    │ Período do contrato  │ Açõs│
├──┼─────────────┼────────┼──────────────┼──────────────────┼──────────┼──────────────────────┼─────┤
│ 1│ AGF Adv.  ⚠ │ Ativo  │ 👤👤         │ "ip concluída…"  │ TRABALH. │ 26/04 → 26/07 (3m)   │ ✏ 🗑│
└──┴─────────────┴────────┴──────────────┴──────────────────┴──────────┴──────────────────────┴─────┘
```

- Colunas removidas: **Posts**, **Demandas**, **Observações** (a info continua viva dentro do Projeto Completo do cliente).
- Ao lado do nome do cliente passa a aparecer um **cluster discreto de indicadores** (ver abaixo).
- Cabeçalhos viram **clicáveis** para ordenar.
- Toggle de **densidade** (Compacto / Confortável) ao lado do botão "Colunas".

### 1. Coluna Responsáveis — agora "Responsáveis do cliente"

- Substitui o cálculo atual (união dos responsáveis dos cards de posts) pelo campo `cliente.responsaveis` já existente.
- Reaproveita o componente pronto `src/components/clientes/CelulaResponsaveis.tsx` — clicar abre popover com checkboxes e persiste via `updateCliente`.
- Cabeçalho passa a ser apenas **"Responsáveis"**.
- Filtro "Filtrar por responsável do post" no topo passa a se chamar **"Filtrar por responsável"** e usa `cliente.responsaveis` (alinhado com a coluna).

### 2. Indicadores rápidos de saúde (badges discretos ao lado do nome)

Pequenos ícones com tooltip — só aparecem quando há algo a sinalizar:

| Ícone | Significado | Tooltip |
|---|---|---|
| 🔴 número | Posts atrasados (`status_card === "Atrasado"`) | "N posts atrasados" |
| 🟠 número | Demandas atrasadas (`demanda.status === "Atrasado"`) | "N demandas atrasadas" |
| ⚡ número | Demandas urgentes (`prioridade === "Urgente"`) | "N demandas urgentes" |
| 📅 | Contrato vence em ≤ 15 dias | "Contrato vence em X dias" |
| 🆕 | Cliente em Onboarding com prazo vencido | "Onboarding atrasado" |

Cluster fica imediatamente após o nome, com hover destacando. Não voltam como colunas — ocupam ~60px ao lado do título.

### 3. Filtros melhores no topo

Barra reorganizada em uma linha (com wrap em telas menores):

- **Busca** (mantém — já filtra nome/nicho/observações).
- **Status** (mantém — Onboarding/Ativo/Pausado/Encerrado).
- **Responsável** (multi-select, sobre `cliente.responsaveis`).
- **Nicho** (novo — multi-select, lê de `nichos`).
- **Período do contrato** (novo — opções: "Vence em 30 dias", "Vence em 90 dias", "Já vencido", "Todos").
- **Minhas tarefas** (mantém o toggle "apenas onde sou responsável").
- Botão **"Limpar filtros"** aparece quando algum filtro ≠ default.
- Contador "X de Y clientes" ao lado do título reflete os filtros ativos.

### 4. Ordenação por coluna + densidade

- Colunas ordenáveis: Cliente, Status, Nicho, Período (data início).
- Click no header alterna asc/desc; setinha aparece na ativa. Estado guardado em `localStorage` por usuário (`dashtasks.clientes.sort`).
- Toggle **densidade**: "Compacto" (atual) ↔ "Confortável" (linhas 36→44px, padding maior). Persistido em `localStorage` (`dashtasks.clientes.density`).

### Detalhes técnicos

**Arquivos editados:**

1. `src/components/clientes/ClientesGeralTable.tsx`
   - Remover colunas/células: Posts, Demandas, Observações.
   - Trocar coluna "Responsáveis dos Posts" por `<CelulaResponsaveis clienteId={cliente.id} ids={cliente.responsaveis ?? []} />`.
   - Remover memo `respsPostsPorCliente`; filtros de responsável passam a olhar `cliente.responsaveis`.
   - Computar `indicadores` por cliente (postsAtrasados, demAtrasadas, demUrgentes, contratoVencendo, onboardingVencido) e renderizar cluster ao lado do `Link`.
   - Aceitar novas props: `sortKey`, `sortDir`, `onSortChange`, `density`, `filtroNicho?: string[]`, `filtroPeriodoContrato?: "30" | "90" | "vencido" | "todos"`.
   - Headers ordenáveis viram `<button>` com ícone `ChevronsUpDown` / `ChevronUp` / `ChevronDown`.
   - Tabela aplica classes condicionais a partir de `density` ("Compacto" mantém `[&_th]:h-7 [&_td]:py-1`; "Confortável" usa `h-10`/`py-2`).

2. `src/pages/Clientes.tsx`
   - Renomear filtro "Filtrar por responsável do post" → "Filtrar por responsável" (e referência interna).
   - Adicionar selects de **Nicho** e **Período do contrato** na barra superior.
   - Adicionar botão "Limpar filtros".
   - Adicionar toggle de densidade (`ToggleGroup` com Compacto/Confortável) próximo ao botão "Colunas".
   - Estado `sort` + `density` persistidos via `localStorage` com hooks simples (`useState` + `useEffect`).
   - Atualizar contador no header para refletir lista filtrada.
   - Passar todas as props novas para `<ClientesGeralTable />`.

**Sem alterações** em store, schema Supabase, rotas, ou em outras telas que reusam a tabela (props novas são opcionais e mantêm fallback ao comportamento atual).

### Resultado

- Painel mais limpo focado nas 6 colunas que você definiu.
- Saúde do cliente continua visível, mas como sinal compacto.
- Filtros cobrem os campos que realmente importam (status, responsável, nicho, contrato).
- Cabeçalhos ordenáveis + densidade ajustável tornam a navegação por 43+ clientes muito mais rápida.
