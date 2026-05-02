
# Redesign do módulo "Relatórios"

Reestruturação visual e analítica da página `/relatorios` mantendo as mesmas fontes de dados (`useCRM`, `useDemandas`). Nada fora do módulo é alterado.

## Escopo (apenas estes arquivos)

- `src/pages/Relatorios.tsx` — reescrito (header, filtros, tabs, layout)
- `src/components/demandas/RelatoriosDemandas.tsx` — reescrito (KPIs + gráficos novos)
- **Novo:** `src/components/relatorios/RelatoriosPosts.tsx` — extrai a aba Posts
- **Novo:** `src/components/relatorios/KpiCard.tsx` — card de métrica reutilizável (ícone + valor + delta + sparkline opcional)

Nenhuma rota, store, sidebar ou tabela é tocada.

## Estrutura nova da página

```text
┌───────────────────────────────────────────────────────────────────┐
│ Header                                                             │
│  Relatórios  ·  Visão analítica do Dash Tasks                      │
│  [Período: 7d | 30d | 90d | Ano | Tudo]  [Responsável ▾] [Export] │
├───────────────────────────────────────────────────────────────────┤
│ Tabs: Visão Geral | Posts | Demandas | Clientes                    │
├───────────────────────────────────────────────────────────────────┤
│ KPIs (grid 2/4/6 colunas conforme breakpoint)                      │
│  [Total Posts] [Postados] [Pendentes] [Demandas] [Concluídas] [⚠] │
├───────────────────────────────────────────────────────────────────┤
│ Charts grid responsivo (lg:grid-cols-12)                           │
└───────────────────────────────────────────────────────────────────┘
```

## Conteúdo por aba

**Visão Geral (nova):**
- 6 KPIs: Posts totais, Postados no período, Pendentes, Demandas ativas, Concluídas, Atrasadas (destaque)
- Área chart "Atividade dos últimos 30 dias" (posts criados vs demandas concluídas) — `lg:col-span-8`
- Donut "Distribuição de status de clientes" (Onboarding/Ativo/Pausado/Encerrado) — `lg:col-span-4`
- Bar horizontal "Top 5 responsáveis por carga combinada" — `lg:col-span-6`
- Bar "Posts por mês (ano corrente)" — `lg:col-span-6`

**Posts (refeito):**
- KPIs: Total, Postados, Em criação, Em revisão, Agendados, Renovação
- Line/Area chart "Posts por mês" com gradient
- Donut "Funil de status" com legenda lateral e percentuais
- Bar horizontal "Carga por responsável" com cor do responsável
- Stacked bar "Posts por status × mês" (últimos 6 meses)

**Demandas (refeito):**
- KPIs: Total, Concluídas, Em andamento, Atrasadas (destaque), Urgentes, Taxa conclusão (%)
- Donut "Por status" (mantendo cores STATUS_DEMANDA_COR)
- Bar "Por categoria" (cores distintas)
- Bar horizontal "Por responsável"
- Bar "Por prioridade" (Baixa/Média/Alta/Urgente)

**Clientes (nova):**
- KPIs: Total clientes, Ativos, Onboarding, Pausados
- Donut "Status global"
- Bar "Clientes por nicho (top 8)"
- Bar horizontal "Carga de clientes por responsável"

## Detalhes de design

- Tokens semânticos apenas (`bg-card`, `text-foreground`, `border-border`, `hsl(var(--primary))`, etc). Mantém a regra Core de cores azul-escuras no dark.
- `Card` com header compacto: ícone (lucide) + título + descrição curta + ação opcional (ex.: "Ver detalhes")
- KpiCard: ícone em badge translúcido (`bg-primary/10`), valor em `text-3xl font-bold tracking-tight`, label `text-xs uppercase text-muted-foreground`, delta opcional (verde/vermelho)
- Tooltips e legendas Recharts padronizados (popover bg, border-border, radius 8)
- Gradientes nas áreas via `<defs><linearGradient/></defs>` com `--primary`
- Animações: `animate-fade-in` no container, transições suaves nos cards (`transition-shadow hover:shadow-md`)
- Filtros (período/responsável) implementados localmente com `useState` + `useMemo` — filtram os datasets antes de alimentar gráficos
- Botão "Exportar CSV" gera dump dos KPIs visíveis da aba ativa (client-side, `Blob` + `a.download`)

## Detalhes técnicos

- Recharts já instalado; nada novo a adicionar
- `KpiCard` props: `{ icon: LucideIcon; label: string; value: string|number; hint?: string; tone?: "default"|"success"|"warning"|"destructive"; delta?: number }`
- Helpers de período em `Relatorios.tsx`: `filterByRange(items, dateField, range)` retornando subset
- `ChartCard` (wrapper local opcional) para padronizar header + altura + ResponsiveContainer
- Sem chamadas de rede novas; tudo derivado de `useCRM()` e `useDemandas()`
- Mobile: KPIs em 2 colunas, charts empilham (`grid-cols-1`)

## Fora de escopo

- Nenhuma alteração em sidebar, rotas, stores, banco, RLS ou outros módulos
- Sem novas dependências
- Sem mudança nas memórias de design (paleta atual respeitada)
