
# Central de Ativação — Plano de Implementação

Camada gerencial e visual sobre o que já existe no Dash Tasks. **Nada novo de status, badges, tarefas, Cards Pai ou Kanban.** Apenas leitura agregada + 2 ações novas (marcar etapa como "já existente / não aplicável" e "marcar cliente como Ativo").

---

## 1. Menu e rota

- `src/components/AppSidebar.tsx`: adicionar item **Central de Ativação** (ícone `Rocket`) entre Dashboard e Central de Tarefas.
- `src/App.tsx`: rota `/central-ativacao` → `pages/CentralAtivacao.tsx`.

## 2. Dados — sem tabelas novas (quando possível)

Auditar antes de migrar:
- `clientes.status_cliente` (já existe: Onboarding / Ativo / Pausado / Encerrado) — fonte de verdade da entrada/saída.
- `clientes.created_at` → dias no onboarding.
- `clientes.data_ativacao` → preencher ao marcar Ativo.
- `card_pai`, `card_pai_etapas`, `demandas`, `cadencias_operacionais`, `historico_demandas`, `atividade_cliente` → leitura.

**Migration necessária (mínima):**
1. **Regras de ativação globais** — não há tabela `system_settings`. Criar `public.ativacao_regras` (linha única, singleton) com flags booleanas (`requer_meta_ads`, `requer_google_ads`, `requer_posts`, `requer_crm`, `requer_lp`, `requer_gmn`, `requer_reuniao_performance`, `requer_checklist`, `modo_regra` text `'todas'|'minimo'`, `quantidade_minima` int). RLS: SELECT authenticated, INSERT/UPDATE admin/super_admin.
2. **Etapa "já existente" / "não aplicável"** — auditar `card_pai_etapas.status_interno_valor` (atual: TEXT, sem CHECK). Usar dois valores convencionados: `'ja_existente'` e `'nao_aplicavel'`. Nenhuma migration de schema, só convenção + registro em `historico_demandas` ou `atividade_cliente`.

## 3. Páginas / componentes

```
src/pages/CentralAtivacao.tsx              # lista + KPIs + filtros
src/pages/CentralAtivacaoCliente.tsx       # detalhe (ou drawer/dialog dentro da lista)
src/components/ativacao/
  CentralAtivacaoHeader.tsx                # título + Regras + Importar
  CentralAtivacaoKpis.tsx                  # 5 cards
  CentralAtivacaoFiltros.tsx
  CentralAtivacaoTable.tsx                 # tabela principal
  ModulosCardPaiList.tsx                   # módulos por cliente (detalhe)
  RegrasAtivacaoDialog.tsx                 # admin: edita ativacao_regras
  ImportarClientesDialog.tsx               # seleciona clientes não-onboarding e troca status
  MarcarAtivoDialog.tsx                    # validação + confirm + forçar (admin)
  EtapaJaExisteMenu.tsx                    # action em etapa do Card Pai
src/hooks/useOnboardingProgress.ts         # progresso + risco + gargalo por cliente
src/hooks/useAtivacaoRegras.ts
src/lib/ativacaoRules.ts                   # cálculo puro (status principal, risco, progresso, pronto-pra-ativar)
```

## 4. Lógica central (`ativacaoRules.ts`)

Pure functions, sem fetch:
- `calcularProgresso(cards, etapas, demandas)` → `resolvidas / aplicaveis`. Resolvidas: status concluído/entregue/postado + `status_interno_valor in ('ja_existente','nao_aplicavel')`.
- `calcularStatusPrincipal(...)` → retorna primeiro item encontrado na ordem do gargalo (Atrasado → Aguardando cliente → ... → Concluído). Usa status já existentes em `demandas.status` / `cards.status`.
- `calcularRisco(...)` → OK / Atenção / Crítico, segundo regras 18 e 19 (sem responsável, sem prazo, sem avanço, dias em onboarding, badges/status motivo pendentes).
- `clientePodeAtivar(cliente, agregado, regras)` → boolean + lista de pendências críticas.

## 5. Importar clientes / enviar para Central

- Tela Clientes: ação individual + ação em massa "Enviar para Central de Ativação" (update `status_cliente='Onboarding'`).
- Central: botão "Importar clientes" abre dialog com clientes em Ativo/Pausado/Encerrado, multi-seleção.
- Confirmação com texto da spec. Idempotente — quem já está em Onboarding não muda.

## 6. Marcar como Ativo

- Botão por linha + dentro do detalhe.
- `MarcarAtivoDialog` lista pendências críticas (de `clientePodeAtivar`); se houver, só admin/super_admin vê "Marcar mesmo assim".
- Update `status_cliente='Ativo'`, `data_ativacao=now()`. Log em `atividade_cliente`.

## 7. Realtime

Usar invalidação React Query no `queryKey: ['central-ativacao']`. Hooks ouvem mudanças via stores Zustand existentes (`useCRM`, `useDemandas`, `useCardPai`) — já reativos. Adicionar subscription Supabase apenas se necessário (provavelmente não, pois o app já hidrata via stores).

## 8. Permissões

Usa `has_role` / `can_write` já existentes. Frontend: gating via `useAuth()` para botões admin/super_admin (regras + forçar ativo).

## 9. Design

Tokens semânticos (`bg-card`, `text-foreground`, `border-border`), mesmos componentes shadcn já em uso (Table, Card, Badge, Dialog). Sem novas cores. Reaproveita `StatusBadge`, `StatusClienteBadge`, `AvatarStack`.

## 10. Não fazer (confirmado)

Sem novo Kanban, sem novo cadastro de cliente na Central, sem novos status/badges, sem duplicação de Cards Pai/tarefas, sem alterar a aba Operacional.

---

## Ordem de execução

1. Migration `ativacao_regras` (singleton + RLS).
2. `ativacaoRules.ts` + `useOnboardingProgress` + `useAtivacaoRegras`.
3. Página + Header + KPIs + Filtros + Tabela.
4. Detalhe (drawer no clique da linha) com módulos de Cards Pai e ações "já existente / não aplicável".
5. `RegrasAtivacaoDialog`, `ImportarClientesDialog`, `MarcarAtivoDialog`.
6. Sidebar + rota + ações em massa na tela Clientes.
7. QA da lista de validação (32 itens).

**Confirma para eu prosseguir?** Vou começar pela migration `ativacao_regras` (precisa da sua aprovação) e em paralelo o cálculo puro/hook, depois UI.
