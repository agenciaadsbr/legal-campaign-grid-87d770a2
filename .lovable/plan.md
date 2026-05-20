# Renomear "Revisar" → "Aguardando aprovação do cliente"

## Decisão importante

O valor interno do status no banco (`demanda_status` enum, coluna `status` em `cards`, `status_post_options.label`, `status_demanda_options.label`) continua sendo `"Revisar"`. Apenas o **rótulo visível ao usuário** muda para `"Aguardando aprovação do cliente"`.

Motivo: renomear o enum/linhas no banco quebraria dados, triggers (`track_approval_status_*`, `update_client_primary_status`, `auto_marcar_atrasado`), histórico (`historico_demandas`), `atividade_cliente` e o RPC de KPIs. O usuário pediu para não remover dados nem funcionalidades.

`StatusBadge` e `STATUS_DEMANDA_LABEL` já mapeiam `Revisar → "Aguardando aprovação do cliente"`. Os pontos restantes são literais hardcoded em KPIs, dashboards e relatórios.

## Arquivos a alterar (apenas textos visíveis)

1. **src/pages/Dashboard.tsx** (linhas 163, 178) — `label="Em revisão"` → `label="Aguardando aprovação do cliente"` nos dois `KpiCard` (posts e demandas).
2. **src/components/relatorios/RelatoriosPosts.tsx** (linha 95) — `label="Em revisão"` → `label="Aguardando aprovação do cliente"`.
3. **src/components/demandas/DashboardDemandasSection.tsx** (linha 78) — `label="Em revisão"` → `label="Aguardando aprovação do cliente"`.
4. **src/components/ConfiguracoesDemandasManager.tsx** (linha 285) — texto explicativo `(Planejamento, Criar, Revisar, Entregue, Concluído, Atrasado)` → trocar `Revisar` por `Aguardando aprovação do cliente`.
5. **Verificação extra**: rodar busca por outras strings visíveis (`Em revisão`, `>Revisar<`, tooltips, headings de Kanban) e ajustar se aparecerem — Kanban e selects já consomem `STATUS_DEMANDA_LABEL`/`StatusBadge`, então devem renderizar automaticamente o novo rótulo.

## Não alterar

- `src/lib/demandas-categorias.ts` (enum/array/cores) — chave `Revisar` permanece (já mapeia para o label correto).
- `src/lib/minhasTarefas.ts`, `src/store/crm.ts`, `src/components/StatusBadge.tsx` — comparam pelo valor interno `"Revisar"`; não mexer.
- Migrations, triggers, RPCs, tipos gerados (`src/integrations/supabase/types.ts`) — intocados.
- Filtros, KPIs por status, contagens e cores — preservados.

## Validação

- Abrir Dashboard, Relatórios de Posts, Dashboard de Demandas, Configurações de Demandas → confirmar novo rótulo.
- Abrir Kanban e dropdowns de status → já devem mostrar "Aguardando aprovação do cliente" via `STATUS_DEMANDA_LABEL`.
- Central de Tarefas e badges seguem funcionando (colunas Entrada/Dias em aprovação inalteradas).
- Nenhum dado removido; nenhuma funcionalidade alterada.
