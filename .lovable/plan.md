## Atualização Estrutural — Clientes + Status Onboarding

**Princípio:** tudo é ADIÇÃO/EXTENSÃO. Kanban atual de posts, lógica de `primary_status` (Revisar/Criar/Concluídos), filtros existentes e o fluxo de "Visão por Status" continuam **idênticos**.

---

### 1. Banco de dados (migration)

**`clientes`** — adicionar colunas (não-destrutivo):
- `status_cliente` text NOT NULL DEFAULT `'Onboarding'` — valores aceitos: `Onboarding | Ativo | Pausado | Encerrado`. *Não usa enum* para permitir extensão futura via UI.
- `data_inicio_onboarding` timestamptz DEFAULT `now()`
- `prazo_onboarding` date NULL
- `data_ativacao` timestamptz NULL
- Backfill: clientes existentes recebem `status_cliente = 'Ativo'` e `data_ativacao = created_at` (não são onboarding retroativos).

> **Compatibilidade:** o atual `clientes.status` (Ativo por padrão) **permanece** intacto. `status_cliente` é um campo novo e independente, lido pela UI nova.

### 2. Store (`src/store/crm.ts`)

- Estender `interface Cliente` com `status_cliente`, `data_inicio_onboarding`, `prazo_onboarding`, `data_ativacao`.
- `mapCliente`: ler os novos campos (default `'Onboarding'` quando ausente).
- `addCliente`: gravar `status_cliente = 'Onboarding'` + `data_inicio_onboarding = now()` por padrão (override via payload).
- `updateCliente`: aceitar patch nesses campos. Quando `status_cliente` muda para `'Ativo'`, gravar `data_ativacao = now()` se ainda nulo.

### 3. Aba Clientes — toggle de visualização (`src/pages/Clientes.tsx`)

Adicionar **toggle no topo**: `[ Clientes | Status ]` (default = **Clientes**), persistido em `localStorage`.

- **Visão "Status" (atual)**: renderiza exatamente a tabela agrupada por Revisar/Criar/Concluídos que já existe — **sem alteração**.
- **Visão "Clientes" (NOVA, padrão)**: nova tabela em novo componente `ClientesGeralTable.tsx` mostrando **TODOS** os clientes (mesmo sem cards/posts), reaproveitando o visual de `ClientesDemandasTable`. Colunas:
  - Nome do cliente + **badge de `status_cliente`** ao lado
  - Status do cliente (filtrável)
  - Responsáveis (AvatarStack)
  - Últimos comentários (clicável → `HistoricoComentariosDialog`)
  - Nicho (ColorBadge)
  - Período do contrato (início → fim)
  - Posts (resumo: postados/total + atrasados)
  - Demandas (resumo: total + atrasadas/urgentes)
  - Observações (truncado)
  - Ações (`AcoesCliente` existente — editar/remover)
- Ordenação alfabética A–Z, com numeração `#` (mesmo padrão de `ClientesDemandasTable`).
- Clicar na linha/nome → mantém comportamento atual (`/clientes/:id` → Kanban de posts).

**Badge `status_cliente`** (componente reutilizável `StatusClienteBadge`):
- Onboarding → azul claro (`bg-blue-500/15 text-blue-600 border-blue-500/30`)
- Ativo → verde (`bg-emerald-500/15 text-emerald-600`)
- Pausado → amarelo (`bg-amber-500/15 text-amber-600`)
- Encerrado → cinza (`bg-muted text-muted-foreground`)

### 4. Filtro Status do Cliente

Adicionar Select **"Status do cliente"** ao lado dos filtros atuais (em ambas as visões): `Todos | Onboarding | Ativo | Pausado | Encerrado`. Filtros existentes (responsáveis, busca, apenas pendentes, mostrar concluídos) permanecem.

### 5. Demandas > Clientes (`ClientesDemandasTable.tsx`)

- Adicionar coluna **"Status do cliente"** com a mesma badge.
- Adicionar Select de filtro por `status_cliente` no topo do módulo Demandas (junto aos filtros existentes).

### 6. Dashboard (`src/pages/Dashboard.tsx`)

Adicionar 3 métricas (cards) sem remover nada:
- Clientes em Onboarding
- Clientes Ativos
- Clientes Pausados

### 7. Alertas de Onboarding (`src/store/crm.ts` + geração no load)

Geração client-side derivada (sem novas tabelas), para clientes com `status_cliente = 'Onboarding'`:
- `[ONBOARDING] Cliente sem demanda criada` — nenhum registro em `demandas`.
- `[ONBOARDING] Cliente sem post iniciado` — nenhum card com `status ≠ 'Planejamento'`.
- `[ONBOARDING] Cliente com prazo de ativação vencido` — `prazo_onboarding < hoje`.

Esses alertas aparecem na página `/alertas` mesclados aos existentes (tipo derivado `Onboarding_*`, marcados visualmente). **Não inserem em `alertas`** (mantém compatibilidade total).

### 8. Regras de negócio

- Cliente novo entra como **Onboarding**.
- Mudança para **Ativo é manual** (admin/editor via dialog de editar cliente — já existe Select de status, basta acrescentar as 4 opções globais ali). Sugestão automática (toast) quando primeiro post for criado OU primeira demanda for criada — mas **não muda automaticamente**.

### 9. Configurações > Demandas (nova aba) — `src/pages/Configuracoes.tsx`

Nova `<TabsTrigger value="demandas">` (admin only) com 3 sub-seções gerenciáveis (CRUD via `OpcoesEditor` reaproveitado):
- **Categorias** (livre)
- **Prioridades** (livre)
- **Status de demandas** (livre, com bloqueio para os essenciais: `Planejamento, Criar, Revisar, Entregue, Concluido, Atrasado` — não podem ser excluídos/renomeados)

Como o schema atual usa **enum Postgres** para `demanda_categoria/status/prioridade`, a customização será armazenada em **3 novas tabelas**:
- `demanda_categorias_custom (id, label, cor, ordem, ativo)`
- `demanda_prioridades_custom (id, label, cor, ordem, ativo)`
- `demanda_status_custom (id, label, cor, ordem, ativo, protegido bool)` — seed inicial com os 6 status protegidos.

Os enums Postgres permanecem (compatibilidade do schema atual). A UI de Demandas passa a **mesclar** o que vem dos enums + as opções customizadas para exibição/filtro. Inserção de demanda continua usando os enums (apenas valores válidos do enum são gravados — opções extras ficam como "rótulos" exibíveis até futura migração de enum→tabela).

### 10. Garantias de compatibilidade

- Kanban de posts: **inalterado**.
- Visão "Status" atual: **inalterada** (apenas escondida atrás do toggle quando o usuário escolhe "Clientes").
- Filtros, busca, configurações, colunas customizáveis: **inalterados**.
- Schema atual de `demandas` (enums): **inalterado**.

---

### Arquivos a editar/criar
- **Migration nova**: `supabase/migrations/<ts>_clientes_status_onboarding.sql` (colunas em `clientes` + 3 tabelas custom + seed status protegidos + RLS espelhando padrão admin/auth_read).
- `src/store/crm.ts` — extensão de tipos, mappers, addCliente/updateCliente, alertas derivados de onboarding.
- `src/pages/Clientes.tsx` — toggle de visualização + filtro status_cliente.
- **Novo**: `src/components/clientes/ClientesGeralTable.tsx` — tabela visão "Clientes".
- **Novo**: `src/components/StatusClienteBadge.tsx` — badge reutilizável.
- `src/components/demandas/ClientesDemandasTable.tsx` — coluna + filtro status_cliente.
- `src/pages/Demandas.tsx` — Select de filtro status_cliente.
- `src/pages/Dashboard.tsx` — 3 métricas onboarding/ativo/pausado.
- `src/pages/Alertas.tsx` — render dos alertas derivados de onboarding.
- `src/pages/Configuracoes.tsx` — nova aba "Demandas".
- **Novo**: `src/components/ConfiguracoesDemandasManager.tsx` — CRUD das 3 listas custom.

Pergunta de confirmação: a "Visão Clientes" deve ser apenas leitura/navegação (clicar abre o Kanban), correto? Sem edição inline nas células dessa nova tabela — ações de editar/remover ficam no botão de ações (`AcoesCliente`).