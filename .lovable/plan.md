# 🔄 Reestruturação do fluxo operacional — Planejamento → Postado

## ⚠️ Diagnóstico do estado atual

Hoje o sistema já tem boa parte da base, mas precisa ser ajustado:

- **Status existentes hoje** (`status_post_options`): `Criar`, `Revisar`, `Agendado`, `Postado`, `Atrasado` — **falta apenas `Planejamento`**.
- **57 cards no banco** (56 em "Criar" + 4 outros). Precisamos decidir o que fazer com os existentes.
- **Geração automática** (`addCliente` em `src/store/crm.ts` linhas 482-509) já cria N×4 cards + posts, mas usa o **primeiro** status da lista (hoje "Criar"). Será trocado para "Planejamento".
- **Kanban dinâmico** (`src/pages/ClienteDetalhe.tsx`) já lê colunas de `statusPostOptions` — basta adicionar Planejamento e o Kanban se atualiza sozinho.
- **Atrasado** já tem função SQL (`marcar_cards_atrasados`), mas roda só sob demanda — vamos agendar via cron ou disparar no carregamento.
- **Dashboard atual** (`src/pages/Dashboard.tsx`) usa status hardcoded antigos (`Agendar`, `Postado`, `Renovação`) — precisa ser refeito para o novo fluxo.

---

## ❗ Decisão importante sobre o que NÃO faz parte deste plano

O guia original pede **muita coisa** (modal de ativação, novos campos `data_prevista`/`data_ativacao`/`prazo_final`/`data_postagem`/`data_conclusao`/`mes`/`semana`/`prioridade`/`observacoes`/`links`, histórico de movimentações, alertas extras, dashboard completo de produtividade, filtros multi-dimensão).

Para entregar com qualidade sem quebrar o que já funciona, este plano cobre o **núcleo operacional** (itens 1-8, 10, 16) em **uma única entrega**. Os itens **9 (dashboard completo), 12 (histórico de movimentações) e 13 (alertas avançados)** ficam como **fase 2** após você validar o fluxo.

Se quiser tudo de uma vez, me avise — mas o risco de bug é maior.

---

## 📦 FASE 1 — Núcleo do novo fluxo (esta entrega)

### 1. Banco de dados (migration)

**a) Adicionar status "Planejamento"** em `status_post_options` como ordem 0 (primeiro):
```sql
UPDATE public.status_post_options SET ordem = ordem + 1;
INSERT INTO public.status_post_options (label, cor, ordem)
VALUES ('Planejamento', '#9ca3af', 0);
```

**b) Trigger automática para marcar atrasados** (substitui chamada manual da função existente):
```sql
-- Trigger BEFORE INSERT/UPDATE em cards: se data_agendada < now() E status IN ('Criar','Revisar','Agendado') → status='Atrasado'
CREATE OR REPLACE FUNCTION public.auto_marcar_atrasado() RETURNS trigger ...
CREATE TRIGGER cards_auto_atrasado BEFORE INSERT OR UPDATE OF data_agendada, status ON public.cards ...
```
Mais um cron via `pg_cron` (se disponível) que roda `marcar_cards_atrasados()` a cada hora — caso contrário, dispararemos no `_loadAll()` do front.

**c) Decisão sobre os 56 cards existentes em "Criar":** vou perguntar via toast/console se quer migrá-los para "Planejamento" — **por padrão deixaremos como estão** (já foram "ativados" implicitamente). Cards novos nascem em Planejamento.

### 2. Store (`src/store/crm.ts`)

- `addCliente`: trocar `statusInicial = get().statusPostOptions[0]?.label ?? "Criar"` por `"Planejamento"` fixo (com fallback para o primeiro disponível).
- Novo método `iniciarTarefa(cardId, { responsaveis, data_agendada })` que valida status atual = "Planejamento" e move para "Criar" + grava `data_agendada`.
- `moveCard`: bloquear arrasto direto de **Planejamento → Criar** sem passar pelo modal (lança erro / flag para o Kanban abrir o modal).
- Disparar `marcar_cards_atrasados` RPC no início do `_loadAll`.

### 3. Kanban (`src/pages/ClienteDetalhe.tsx`)

- Colunas seguem dinâmicas (já lê de `statusPostOptions`), então "Planejamento" aparece automaticamente como primeira coluna após a migration.
- **Contador por coluna** já existe (`{cards.length}`) — apenas garantir destaque visual em "Atrasado" (badge vermelho pulsante).
- **Botão ▶ Iniciar Tarefa** dentro do `CardItem` quando `status_card === "Planejamento"` — abre modal com responsáveis (multi-select) + prazo (data) + observação opcional.
- **Drag & drop:** se origem = Planejamento e destino = Criar (ou qualquer coluna que não Planejamento), abrir o mesmo modal de ativação antes de confirmar a movimentação.

### 4. Filtros novos no Kanban

Adicionar barra de filtros acima das colunas:
- Responsável (multi)
- Status (multi — útil para esconder Postados)
- "Somente atrasados" (toggle)
- "Somente hoje" (toggle, baseado em `data_agendada`)
- "Somente esta semana" (toggle)

Filtro de mês já existe e fica.

### 5. Cores dos status

Atualizar via migration:
- Planejamento = `#9ca3af` (cinza)
- Criar = `#3b82f6` (azul) — hoje está `#005cfa`, ajustar
- Revisar = `#f59e0b` (amarelo) — hoje `#e6ab0a`, ajustar
- Agendado = `#a855f7` (roxo) — hoje `#3b82f6` azul, **trocar**
- Postado = `#10b981` (verde) ✅ já correto
- Atrasado = `#ef4444` (vermelho) ✅ já correto

### 6. Painel "CRIAR" da página `/clientes`

A página `Clientes.tsx` agrupa hoje em REVISAR/CRIAR/CONCLUÍDOS via `primary_status`. A função SQL `update_client_primary_status` precisa ser ajustada para considerar **Planejamento ≠ tarefa ativa** — clientes só com cards em Planejamento entram em **CONCLUÍDOS** (pendentes operacionais = 0).

Atualizar o cálculo `pendentesPorCliente` (em `Clientes.tsx`) para **ignorar cards em "Planejamento"** ao contar pendências.

---

## 📦 FASE 2 — Adições (NÃO inclusas nesta entrega, perguntarei depois)

- Dashboard operacional completo (tarefas hoje/atrasadas/revisar/agendadas hoje/produtividade por responsável).
- Tabela `card_historico` com gatilhos para registrar todas movimentações + viewer dentro do card.
- Alertas automáticos avançados (revisão parada > 2 dias, card sem responsável).
- Campos extras no post (prioridade, observações livres, vínculo Meister/Meta separados).

---

## 🗂️ Arquivos editados

- **Migration nova** (adicionar Planejamento, ajustar cores, trigger atrasado, ajustar `update_client_primary_status`).
- `src/store/crm.ts` — `addCliente` usa Planejamento, novo `iniciarTarefa`, dispara `marcar_cards_atrasados` no boot.
- `src/pages/ClienteDetalhe.tsx` — botão "Iniciar tarefa", modal de ativação, filtros novos, intercepta drag de Planejamento.
- `src/pages/Clientes.tsx` — ignora cards em Planejamento ao contar pendentes.
- **Novo:** `src/components/IniciarTarefaDialog.tsx` — modal reutilizável.

---

## ❓ 3 perguntas antes de eu codar

1. **Cards existentes em "Criar" (56):** mover todos para "Planejamento" ou deixar como já estão? (recomendo deixar)
2. **Cron de atrasados:** pode usar `pg_cron` (extensão Supabase) ou prefere disparar só no front a cada `_loadAll`?
3. **Confirma adiar Fase 2** (dashboard completo + histórico + alertas avançados) para depois de validar o fluxo, ou quer tudo agora?