
# Estrutura Operacional Automática no Projeto do Cliente

Implementação incremental e segura, sem remover/alterar nada do que já funciona (posts automáticos, kanbans atuais, layout, workflows).

## Resumo da arquitetura

Reutilizamos a infraestrutura existente de `demandas` (categorias, status, kanban, dependências, workflow encadeado, anexos, comentários, atividades). Adicionamos:

- Nova categoria **`Operacional`** no enum `demanda_categoria`.
- Nova tabela **`operational_templates`** (cards padrão de onboarding).
- Nova flag **`origem`** + **`marcado_ja_possui`** em `demandas` para rastrear cards gerados automaticamente.
- Nova aba **🚀 Operacional** dentro de `ProjetoCliente`, reaproveitando `AreaTab` (mesmo Kanban visual já existente).
- Geração automática ao criar cliente novo + botão manual para clientes antigos.

Nada do existente é apagado: cards antigos continuam intactos, posts automáticos seguem inalterados, demais abas e configurações não mudam.

---

## FASE 1 — Banco (migration única e segura)

1. `ALTER TYPE demanda_categoria ADD VALUE IF NOT EXISTS 'Operacional';`
2. `ALTER TABLE demandas ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';`  
   Valores: `'manual' | 'automatica' | 'template_operacional'`.
3. `ALTER TABLE demandas ADD COLUMN IF NOT EXISTS template_id uuid;` (referência opcional ao template usado).
4. `ALTER TABLE demandas ADD COLUMN IF NOT EXISTS marcado_ja_possui boolean NOT NULL DEFAULT false;`
5. Criar tabela `operational_templates`:
   - `id`, `nome`, `ordem int`, `categoria text default 'Operacional'`, `prioridade demanda_prioridade default 'Media'`, `status_inicial demanda_status default 'Planejamento'`, `ativo bool default true`, `responsavel_padrao_id uuid null`, `permite_dependencia bool default true`, `depends_on_template_id uuid null`, `descricao text`, `created_at`, `updated_at`.
   - RLS: leitura para `authenticated`; insert/update/delete apenas `admin` (mesmo padrão de `demanda_categorias_custom`).
   - Trigger `set_updated_at`.
6. Seed dos 14 templates de onboarding na ordem fornecida (Criar Drive e Acessos … Agendar Reunião Performance), todos `Operacional / Media / Planejamento / ativo=true`.

Atualizar `src/lib/demandas-categorias.ts` para incluir `"Operacional"` em `DemandaCategoria`, `CATEGORIA_LABEL` (`"Operacional"`), `CATEGORIA_SUBTIPOS` (`["Onboarding", "Outro"]`) e em `CATEGORIAS`. **Não** mexer em mapeamentos existentes (Designer/Tecnologia continuam como hoje).

## FASE 2 — Aba Operacional + Kanban

- Em `src/pages/ProjetoCliente.tsx`, inserir novo `TabsTrigger value="operacional"` (ícone Rocket) **entre `ia` e `urgencias`**, e `TabsContent` correspondente.
- Conteúdo usa o mesmo `AreaTab` já usado nas outras áreas, com filtro `categoria === "Operacional"`. Isso herda automaticamente: drag-and-drop, responsáveis, prioridade, anexos, comentários, dependências, workflow encadeado.
- Em `filtrarPorArea` adicionar `case "operacional": return demandas.filter(d => d.categoria === "Operacional");`.
- Colunas Kanban: as colunas pedidas (`Planejamento, A Fazer, Em andamento, Revisão, Entregue, Concluído, Atrasado`) serão mapeadas no `AreaTab` para os status reais já existentes (`Planejamento, Criar, Revisar, Entregue, Concluido, Atrasado`). "A Fazer" = `Criar`, "Em andamento" = nova coluna virtual (status `Criar` com flag `data_inicio` definida) ou — se preferirem fidelidade total — adicionar `'EmAndamento'` e `'Revisao'` ao enum `demanda_status` na mesma migration. **Decisão sugerida:** manter os status atuais e apenas relabelar visualmente, evitando migração maior.

## FASE 3 — Templates operacionais

- Tabela `operational_templates` (Fase 1) + seed inicial.
- Store Zustand `src/store/operationalTemplates.ts` com CRUD (admin).

## FASE 4 — Configurações administrativas

- Em `src/pages/Configuracoes.tsx`, adicionar nova aba **"Estruturas automáticas"** (somente admins, mesmo padrão de `IAConfigManager`).
- Componente novo `src/components/configuracoes/EstruturasAutomaticasManager.tsx` para listar/editar/ativar/desativar/reordenar templates, definir responsável padrão e dependências.
- Nenhuma outra área de Configurações é tocada.

## FASE 5 — Geração automática ao criar cliente

- Em `src/store/crm.ts`, no fluxo de criação de cliente, **manter** geração de posts atual e **adicionar**, após sucesso, chamada a `gerarEstruturaOperacional(clienteId)`:
  - Lê `operational_templates WHERE ativo = true ORDER BY ordem`.
  - Insere uma `demanda` por template com: `categoria='Operacional'`, `status='Criar'` (= "A Fazer"), `prioridade='Media'`, `origem='template_operacional'`, `template_id=<id>`, `responsaveis_ids` do `responsavel_padrao_id` quando houver, `subtipo='Onboarding'`.
  - Se o template tiver `depends_on_template_id`, registra dependência em `task_dependencies` após criação.
- Posts automáticos não são alterados.

## FASE 6 — Botão "Cliente já possui"

- Em `DemandCard` (ou no `DemandaDetalheDialog`), exibir botão **✔ Cliente já possui** apenas quando `origem === 'template_operacional'` e `marcado_ja_possui === false`.
- Ao clicar:
  - `update demandas set status='Concluido', marcado_ja_possui=true, data_conclusao=now() where id=...`
  - `insert into historico_demandas` com `acao='marcado_ja_possui'`.
  - Append em descrição/observação: "Marcado como já existente pelo cliente".
  - Card permanece no banco (nunca deletado).

## FASE 7 — Workflow encadeado

- Cards operacionais já herdam `task_dependencies`, `liberar_dependencias_automaticas` e o sistema de workflow existente.
- Esta fase apenas garante o `depends_on_template_id` no seed/templates para preparar encadeamentos futuros (Criar LP → Ativar Google, etc.). Sem ativar automações novas agora.

## FASE 8 — Clientes antigos

- Nenhuma geração retroativa automática.
- Dentro da aba Operacional, botão admin **"Gerar estrutura operacional"** (visível só para `admin`):
  - Verifica se já existem demandas `origem='template_operacional'` para o cliente; se sim, gera apenas as faltantes (idempotente).
  - Toast com nº de cards criados.

## FASE 9 — Segurança

- Migration usa `IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS` para idempotência.
- Nenhum `DROP`, nenhum delete em `posts`/`cards`/`demandas` existentes.
- RLS de `operational_templates` espelha padrão admin já em uso.
- `origem default 'manual'` garante que demandas antigas continuam classificadas como manuais.

## FASE 10 — Dashboards e Minhas Tarefas

- Como cards operacionais são `demandas`, já aparecem em `MinhasTarefas`, dashboards de demandas, filtros por responsável/período/prioridade — sem mudanças nesses módulos.
- Apenas validar que `CATEGORIA_LABEL["Operacional"]` aparece corretamente nos filtros existentes.

## FASE 11 — Ordem de execução

1. Migration (Fase 1) + atualizar `demandas-categorias.ts` + tipos Supabase regenerados.
2. Store `operationalTemplates` + seed validado.
3. Aba Operacional + integração com `AreaTab` (Fase 2).
4. Configurações → Estruturas automáticas (Fase 4).
5. Hook de geração automática em criação de cliente (Fase 5).
6. Botão "Cliente já possui" (Fase 6).
7. Botão "Gerar estrutura operacional" para clientes antigos (Fase 8).
8. QA: criar cliente novo (verificar 14 cards + posts), cliente antigo (sem cards até clicar no botão), marcar "já possui", drag-and-drop, dashboards, Minhas Tarefas.
9. Publicar.

---

## Arquivos a criar

- `supabase/migrations/<timestamp>_operacional.sql`
- `src/store/operationalTemplates.ts`
- `src/components/configuracoes/EstruturasAutomaticasManager.tsx`
- `src/components/projeto/OperacionalTab.tsx` (wrapper fino sobre `AreaTab` com botão admin "Gerar estrutura operacional")

## Arquivos a editar (mínimo necessário)

- `src/lib/demandas-categorias.ts` — adicionar `Operacional`.
- `src/pages/ProjetoCliente.tsx` — nova aba + filtro.
- `src/store/demandas.ts` — suportar campos `origem`, `template_id`, `marcado_ja_possui`; helper `gerarEstruturaOperacional`; helper `marcarJaPossui`.
- `src/store/crm.ts` — chamar `gerarEstruturaOperacional` após criar cliente.
- `src/pages/Configuracoes.tsx` — nova aba admin.
- `src/components/demandas/DemandCard.tsx` ou `DemandaDetalheDialog.tsx` — botão "Cliente já possui".

## Riscos & mitigação

- **Enum `demanda_categoria`**: `ADD VALUE` não pode rodar dentro de transação implícita junto com seed que use o valor — separar seeds em segunda etapa do mesmo arquivo via `COMMIT;` ou rodar seeds via insert-tool depois da migration.
- **Tipos Supabase**: regenerados automaticamente após migration aprovada.
- **Compatibilidade de status**: mantemos enum atual; relabelagem é só visual no Kanban operacional.
