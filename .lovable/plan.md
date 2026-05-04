## Objetivo

Reestruturar o módulo **Dashboard** (`/`) com um layout mais profissional, denso e organizado por seções temáticas, reaproveitando o componente `KpiCard` (já criado para Relatórios) e expondo métricas reais que hoje não aparecem ou aparecem de forma básica. Nenhuma alteração fora do Dashboard.

## Layout proposto

```text
┌─ Header ──────────────────────────────────────────────────────┐
│ Dashboard                                  [filtro período ▾] │
│ Visão geral em tempo real do Dash Tasks                       │
└───────────────────────────────────────────────────────────────┘

SEÇÃO 1 — Visão Geral (KPIs principais, 4 colunas no desktop)
┌──────────┬──────────┬──────────┬──────────┐
│ Clientes │ Onboard. │ Ativos   │ Pausados │
│ total    │ +renov.  │ +%       │          │
└──────────┴──────────┴──────────┴──────────┘

SEÇÃO 2 — Conteúdo & Posts (6 KPIs)
[Total posts] [Criar] [Revisar] [Agendar] [Postados] [Hoje]

SEÇÃO 3 — Demandas Internas (5 KPIs)
[Abertas] [Urgentes] [Atrasadas] [Em revisão] [Concluídas hoje]

SEÇÃO 4 — Gráficos (grid 12 col)
┌─ col-8 ─────────────────────────┬─ col-4 ───────────┐
│ Posts por mês (AreaChart)       │ Distribuição de   │
│ últimos 12 meses                │ status de clientes│
│                                 │ (Donut)           │
└─────────────────────────────────┴───────────────────┘
┌─ col-6 ─────────────────────────┬─ col-6 ───────────┐
│ Carga por responsável — Posts   │ Carga por respon. │
│ (Bar horizontal, ordenado)      │ — Demandas (Bar)  │
└─────────────────────────────────┴───────────────────┘
┌─ col-7 ─────────────────────────┬─ col-5 ───────────┐
│ Demandas por status × prioridade│ Próximos prazos   │
│ (Bar empilhado)                 │ (lista top 6)     │
└─────────────────────────────────┴───────────────────┘

SEÇÃO 5 — Atividade recente
┌─ col-6 ─────────────────────────┬─ col-6 ───────────┐
│ Alertas pendentes (lista top 5) │ Renovações próx.  │
│                                 │ 7 dias (lista)    │
└─────────────────────────────────┴───────────────────┘
```

## Métricas e cálculos (todos derivados dos stores existentes)

**Clientes** (`useCRM`):
- Total, Onboarding, Ativos, Pausados, Encerrados (via `status_global`)
- Renovações em até 7 dias (`prazo_onboarding`)
- % ativos sobre o total (no `hint` do KPI)

**Posts/Cards** (`useCRM.cards` + `posts`):
- Total cards, por status (Criar, Revisar, Agendar, Postado, Renovação)
- Posts criados hoje
- Série mensal últimos 12 meses (AreaChart com gradiente)
- Carga por responsável (BarChart horizontal ordenado desc)

**Demandas** (`useDemandas`):
- Abertas (status ≠ Concluido), Urgentes, Atrasadas, Em revisão, Concluídas hoje
- Empilhado status × prioridade (Bar stacked)
- Carga por responsável (usa `getResponsaveisIds`)
- Próximos prazos: top 6 demandas com `data_limite` futuro mais próximo, status ≠ Concluido

**Atividade**:
- Top 5 alertas com `status === "Pendente"` (mensagem + cliente + data)
- Top 5 clientes em renovação ≤ 7 dias com nome, dias restantes e badge

## Arquivos afetados (apenas Dashboard)

- `src/pages/Dashboard.tsx` — reescrito, usando `KpiCard` e novos gráficos.
- `src/components/dashboard/ProximosPrazosCard.tsx` — **novo** (lista demandas próximas do vencimento).
- `src/components/dashboard/AlertasRecentesCard.tsx` — **novo** (lista alertas pendentes).
- `src/components/dashboard/RenovacoesCard.tsx` — **novo** (lista renovações próximas).
- `src/components/dashboard/StatusClientesDonut.tsx` — **novo** (donut com distribuição de status).
- `src/components/dashboard/DemandasStackedBar.tsx` — **novo** (status × prioridade).

`DashboardDemandasSection.tsx` continua existindo (usado em outros lugares? checar — se só Dashboard, vira KPIs inline da Seção 3 sem remover o arquivo para evitar quebras; manteremos o arquivo intacto e apenas pararemos de importá-lo no Dashboard).

## Detalhes técnicos

- Reutilizar `KpiCard` existente (`src/components/relatorios/KpiCard.tsx`) — sem duplicar.
- Gráficos com `recharts`, mesmo `tooltipStyle` usado em Relatórios para consistência visual.
- Cores via tokens HSL do `index.css` (`--primary`, `--status-*`, `--destructive`, `--info`) — nada hardcoded.
- Layout responsivo: KPIs `grid-cols-2 md:grid-cols-3 lg:grid-cols-{4|5|6}`; gráficos `lg:grid-cols-12`.
- Tudo em `useMemo` para evitar recomputo a cada render.
- Sem migrações de banco. Sem novas dependências.
- Escopo restrito: nenhuma alteração em Relatórios, Demandas, Configurações, sidebar ou stores.

## Critérios de aceitação

1. `/` exibe header, 5 seções na ordem descrita.
2. KPIs mostram contagens reais derivadas dos stores (zero quando não há dados).
3. Gráficos renderizam com tokens semânticos de cor (dark/light corretos).
4. Listas de "Próximos prazos", "Alertas" e "Renovações" mostram até 6/5 itens com vazio amigável quando não há dados.
5. Nenhum arquivo fora de `src/pages/Dashboard.tsx` e `src/components/dashboard/*` é alterado.
