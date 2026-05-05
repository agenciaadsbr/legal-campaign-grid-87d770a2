# Padronização do módulo Dashboard

Compactar as abas **Visão Geral** e **Por Colaborador** do Dashboard para a mesma densidade visual do módulo Clientes (header menor, KPIs `compact`, filtros `h-8`, cards com headers/charts mais densos).

## 1. `src/pages/Dashboard.tsx`

**Container e header**
- Wrapper: `p-6 space-y-6` → `px-5 py-4 space-y-3`
- `<h1>` `text-2xl` → `text-xl leading-tight`
- Subtítulo `text-sm` → `text-xs`
- "Atualizado em…" mantém `text-xs`

**Tabs**
- `Tabs ... space-y-6` → `space-y-3`
- `TabsList` recebe `h-8`
- Cada `TabsTrigger` recebe `text-xs h-7`
- `TabsContent value="geral" space-y-6 mt-0` → `space-y-4 mt-2`
- `TabsContent value="colaborador" mt-0` → `mt-2`

**Seções de KPIs (Clientes / Posts / Demandas)**
- `section space-y-3` mantido; `gap-3` dos grids → `gap-2`
- Todos os `<KpiCard ... />` recebem `compact`
- `SectionHeader`: `h2 text-base` → `text-sm font-semibold`; subtitle continua `text-xs`

**Seção 4 — Gráficos**
- Grid `gap-4` → `gap-3`
- Em cada `Card` de gráfico:
  - `CardHeader pb-2` → `p-3 pb-1`
  - `CardTitle text-base` → `text-sm`
  - `CardDescription` → adicionar `text-xs`
  - `CardContent h-72` → `p-3 pt-0 h-56`
- "Sem dados" mantém `text-xs`

**Seção 5 — Atividade**
- Grid `gap-4` → `gap-3`

## 2. `src/components/dashboard/DashboardPorColaborador.tsx`

**Wrapper**
- `space-y-5` → `space-y-3`

**Filtros**
- `gap-3` → `gap-2`
- `SelectTrigger h-9 w-[260px]` → `h-8 w-[240px] text-xs`
- `PeriodoFiltro` herda altura própria (já compacta)

**Empty state "Selecione um colaborador"**
- `p-12 text-sm` → `p-6 text-xs`

**KPIs**
- Grid `gap-3` → `gap-2`
- 4 `<KpiCard>` recebem `compact`

**Cards de gráficos (Distribuição por área, Top 10 prioridades)**
- Grid `gap-4` → `gap-3`
- `CardHeader pb-2` → `p-3 pb-1`
- `CardTitle text-base` → `text-sm`
- `CardDescription` adicionar `text-xs`
- `CardContent h-72` (gráfico) → `p-3 pt-0 h-56`
- `CardContent space-y-1.5 max-h-72` (top 10) → `p-3 pt-0 space-y-1 max-h-56`

**Lista Top 10**
- Item: `gap-2 p-2 rounded` → `gap-2 p-1.5 rounded`
- Título: `text-sm` → `text-xs`
- Subtítulo: `text-[11px]` mantido
- Empty: `py-8 text-xs` → `py-6 text-xs`

## 3. `public/version.json`
Bump do timestamp para invalidar cache.

## Notas

- Nenhuma mudança funcional, lógica de KPIs e dados intacta.
- `KpiCard` já suporta `compact` (introduzido na padronização do Minhas Tarefas) — reutilizado aqui.
- Charts permanecem `ResponsiveContainer`; só a altura do container muda (`h-72` → `h-56`).
- `DashboardDemandasSection.tsx` (usado em outro lugar) **não** é alterado.
