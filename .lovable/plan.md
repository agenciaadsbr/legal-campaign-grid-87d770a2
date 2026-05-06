## Escopo

Apenas: `src/pages/MinhasTarefas.tsx`, `src/components/tarefas/MinhasTarefasTabela.tsx`, `src/components/filters/PeriodoFiltro.tsx` e `src/components/ui/calendar.tsx` (apenas se necessário para localização — sem mudanças visuais que afetem outros usos).

Sem mudanças em lógica de dados, store, banco, Projeto Completo ou Clientes.

---

## 1. Agrupamento visual por status (Minhas Tarefas)

Em `MinhasTarefasTabela.tsx`:

- Manter o `ordenarTarefas` atual (que já prioriza urgente → atrasado → prazo → prioridade), mas **agrupar a renderização** por chave de status na ordem fixa:
  1. `urgente` (qualquer task com `t.urgente === true` e status ≠ concluído)
  2. `atrasado`
  3. `em_andamento`
  4. `pendente`
  5. `concluido`
- Antes de cada grupo (com ≥1 item), renderizar uma `TableRow` "header" com colspan total, contendo um pequeno cabeçalho sutil:
  - Ícone + label + contagem
  - Estilo: `bg-muted/30`, `text-[10px] uppercase tracking-wider text-muted-foreground`, padding reduzido, sem hover
- Headers (ícones lucide):
  - ⚡ `Zap` — Urgentes (text-destructive)
  - 🔴 `AlertCircle` — Atrasadas (text-destructive)
  - 🔵 `Clock` — Em andamento (text-info ou text-sky-500)
  - ⚪ `Circle` — Pendentes (text-muted-foreground)
  - 🟢 `CheckCircle2` — Concluídas (text-emerald-500)
- Nenhum accordion. Apenas linhas-cabeçalho.

## 2. Padronização visual das linhas e badges

Em `MinhasTarefasTabela.tsx`:

- Aumentar respiro vertical das linhas: `[&_td]:py-2` (era `py-1`).
- Atualizar `STATUS_COR` para tons suaves consistentes via tokens:
  - `pendente`: cinza neutro (`hsl(var(--muted-foreground))`)
  - `em_andamento`: azul suave (`hsl(var(--info))`)
  - `atrasado`: vermelho suave (`hsl(var(--destructive))`)
  - `concluido`: verde suave (`hsl(var(--status-postado))`)
- Linha de tarefa **concluída**: aplicar `opacity-60` e `text-muted-foreground` no título, para "abaixar" visualmente.
- Linha **urgente**: borda lateral esquerda destacada via `border-l-2 border-destructive` (substitui o `bg-sky-500/5` atual, que confundia com "em andamento").
- Linha **atrasada**: manter `bg-destructive/5` leve (sem exagero).
- Alinhar verticalmente badges/datas com `align-middle` e datas com `tabular-nums` (já existe).
- Coluna Status: badge com largura mínima consistente (`min-w-[88px] justify-center`) para alinhamento vertical.

## 3. Calendário em pt-BR

Em `src/components/filters/PeriodoFiltro.tsx`:

- Importar `ptBR` de `date-fns/locale` e passar `locale={ptBR}` no `<Calendar />`.
- Passar `weekStartsOn={0}` (domingo) ou `1` se preferir; manter padrão semana começando no domingo (já é o comportamento atual).
- Os dias da semana ("Dom, Seg, Ter, Qua, Qui, Sex, Sáb") e o nome do mês passam a vir automaticamente do locale do react-day-picker.
- Não alterar `src/components/ui/calendar.tsx` (mudaria comportamento global). A localização é passada via prop apenas no PeriodoFiltro.

## 4. Corrigir corte/largura do calendário

Em `PeriodoFiltro.tsx`:

- Aumentar largura do `PopoverContent` de `w-[480px]` para `w-[560px]` e tornar responsivo: `w-[min(560px,calc(100vw-2rem))]`.
- Trocar o grid `grid-cols-2` por layout flex que dá largura mínima adequada à coluna do calendário:
  - Lista de presets: `w-[180px] shrink-0`
  - Calendário: `flex-1 min-w-[320px]`
- Remover `numberOfMonths={1}` desnecessário e adicionar `className="p-3 pointer-events-auto"` ao `<Calendar />` (conforme padrão do projeto).
- Garantir que o `PopoverContent` use `align="start"` e tenha `collisionPadding` para não sair da viewport.

## 5. Polimento dos presets

Em `PeriodoFiltro.tsx`:

- Renomear o grupo `"—"` interno para diferenciar "Geral" (Todos) e "Personalizado" — colocar `Todos` no topo sem header e `Personalizado…` separado no rodapé do painel esquerdo, com pequeno divisor (`<div className="border-t border-border my-1" />`).
- Headers de grupo: aumentar padding (`px-2 py-1.5`), manter tipografia atual.
- Botões de preset: `py-2` (em vez de `py-1.5`) para respiro; manter destaque do selecionado.

## 6. Validação dos filtros de período

A lógica em `MinhasTarefas.tsx` (linhas 107–143) já trata corretamente os presets futuro/passado/personalizado. **Não será alterada**. Apenas confirmar visualmente após a implementação que cada preset filtra como esperado e o agrupamento visual permanece consistente.

---

## Detalhes técnicos

- `STATUS_ORDER`: `["urgente","atrasado","em_andamento","pendente","concluido"]` — apenas para agrupar UI; não muda `ordenarTarefas`.
- Agrupamento no componente: `useMemo` que percorre `tasks` (já ordenadas) e particiona em buckets, então mapeia para `<>{header}{rows}</>`.
- Header row: `<TableRow className="hover:bg-transparent bg-muted/30"><TableCell colSpan={N} className="py-1.5">…</TableCell></TableRow>` onde `N` depende de `mostrarResponsavel`.
- Locale `ptBR`: import `import { ptBR } from "date-fns/locale";` (já é dependência do projeto via `react-day-picker`).

## Fora de escopo

- Não mudar `ordenarTarefas`, `buildUnifiedTasks`, stores, rotas, ou outras telas.
- Não tocar `calendar.tsx` global.
- Não alterar KPIs nem Select de visualização (admin).
