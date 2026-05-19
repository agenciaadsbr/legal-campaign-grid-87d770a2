# Aba Operacional — Excluir Selecionados + Card Pai Inteligente

Escopo restrito: **apenas a aba Operacional do Projeto Completo**. Nenhuma outra aba, workflow ou dado existente será alterado/removido.

---

## Parte 1 — "Excluir selecionados" no modo Selecionar

### Onde
`src/components/projeto/AreaTab.tsx` (componente é compartilhado por todas as áreas).

### Como (sem afetar outras abas)
- Adicionar nova prop opcional `allowBulkDelete?: boolean` em `AreaTab`.
- `OperacionalTab` passa `allowBulkDelete` quando `isAdmin === true`.
- Outras abas continuam sem o botão (prop não passada → `undefined` → não renderiza).

### Botão na barra de seleção em massa
- Renderizar `<Button variant="destructive">Excluir selecionados</Button>` ao lado de "Limpar/Sair".
- `disabled={selectedIds.size === 0}`.
- Ao clicar: abrir `AlertDialog` (já existe em `@/components/ui/alert-dialog`) com mensagem exata: *"Tem certeza que deseja excluir as tarefas selecionadas? Essa ação não poderá ser desfeita."* Botões: **Cancelar** / **Excluir selecionados**.
- Ao confirmar:
  - Chamar `useDemandas.getState().removeDemanda(id)` (já existe) para cada id selecionado em paralelo.
  - `toast.success(\`${n} tarefa(s) excluída(s)\`)`.
  - Sair do modo seleção, recarregar (`useDemandas.load()`), atualizar contadores (já são derivados).
  - Atividades: trigger `log_atividade_demanda` no banco já registra DELETE? Verificar — se não, fazer insert manual em `atividade_cliente` (tipo `demanda`, acao `excluido_em_lote`).

---

## Parte 2 — Card Pai inteligente (camada nova)

Implementado como **camada aditiva**, sem mexer no fluxo de cards comuns.

### 2.1 Schema (migração)

**Novas tabelas:**

- `card_pai`
  - `id`, `cliente_id`, `titulo`, `descricao`, `status_geral` (texto livre: Em andamento / Pausado / Concluído), `responsaveis_ids uuid[]`, `created_at`, `updated_at`, `criado_por`.
- `card_pai_etapas`
  - `id`, `card_pai_id`, `ordem`, `tipo` (`tarefa_real` | `status_interno`), `titulo`, `categoria_alvo` (texto: aba destino quando tarefa real), `responsavel_id`, `status_interno_valor` (texto livre quando status interno), `demanda_id` (FK soft p/ `demandas.id` quando tarefa real vinculada), `depends_on_etapa_id`, `liberado bool default true`, `concluido bool default false`, `concluido_em`, `created_at`, `updated_at`.

**Campo novo em `demandas`:**
- `card_pai_id uuid NULL` (referência soft p/ `card_pai.id`) — identifica tarefas reais vinculadas a um Card Pai. Sem FK rígido (mesmo padrão usado em `ia_tarefa_consultas`).

**RLS:** copiar o padrão `auth_read` / `rw_*_insert/update` / `admin_*_delete` usado em `demandas`.

**Triggers:**
- Em `demandas` AFTER UPDATE: se `status` mudou para Concluído/Entregue e a demanda possui `card_pai_id`, marcar a etapa correspondente em `card_pai_etapas` como `concluido=true` e liberar a próxima etapa cuja `depends_on_etapa_id` seja essa.

### 2.2 Store
Novo `src/store/cardPai.ts` (zustand) com:
- `load(clienteId)`, `criarCardPai`, `atualizarCardPai`, `removerCardPai`.
- `adicionarEtapa`, `atualizarEtapa`, `removerEtapa`, `reordenarEtapas`.
- `concluirEtapaInterna`, `liberarEtapa`.
- `vincularDemandaExistente(etapaId, demandaId)` — verifica duplicidade por título+cliente+categoria antes de criar nova.
- `criarTarefaRealParaEtapa(etapaId)` — chama `addDemanda` com categoria alvo + `card_pai_id`.

### 2.3 UI

**`OperacionalTab.tsx`** — substituir o botão único de criação por DropdownMenu:
- "Nova tarefa comum" → fluxo atual (`createRascunho`).
- "Novo Card Pai" → abre `CardPaiFormDialog`.

**Renderização no Kanban Operacional:**
- `ProjetoKanban` / `DemandCard` recebem prop opcional `cardPaiMap` para enriquecer cards cuja origem seja Card Pai. Para o MVP, cards pai serão demandas-fantasma renderizadas em uma faixa separada acima do Kanban (mais simples e isolado): novo componente `CardsPaiLista` mostrando cada Card Pai como card especial com:
  - Badge "Card Pai"
  - Progresso `X/Y etapas`
  - Próxima etapa (primeira não concluída e liberada)
  - Avatares dos responsáveis envolvidos
  - Click → abre `CardPaiDetalheDialog`.

**`CardPaiDetalheDialog`** (novo) — abas/seções:
- Cabeçalho: título, descrição, status geral, responsáveis.
- **Etapas do Processo**: lista ordenável; cada etapa mostra tipo, título, responsável, status (bloqueada/liberada/concluída), botão "Concluir" (status interno) ou link p/ a tarefa real (abre `DemandaDetalheDialog`). Botão "Adicionar etapa" com escolha tarefa real / status interno.
- **Comentários, Anexos, Atividades**: reuso dos componentes já existentes (vinculando por `card_pai_id`).

**`CardPaiFormDialog`** (novo) — criar/editar título, descrição, etapas iniciais, responsáveis.

### 2.4 Sincronização e progresso
- Progresso calculado em runtime no store: `concluidas/total`, `pendentes`, `bloqueadas`, `aguardando_cliente` (etapas internas cujo título/status_interno_valor contenha "aguardando"), `atrasadas` (etapas com `demanda.data_limite < now()`).
- Trigger SQL (acima) garante sincronização quando a tarefa real é concluída em outra aba.

### 2.5 "Gerar estrutura operacional"
- Continua criando cards normais como hoje.
- **Aditivo**: ao final, verifica se já existe Card Pai por título para o cliente; se não, cria os 4 sugeridos vazios (somente título + etapas-modelo): *Ativação Google Ads, Ativação Meta Ads, Produção de Posts, Produção de Vídeos*. Não duplica, não apaga nada.

### 2.6 Não-duplicação ao criar tarefa real via etapa
Antes de inserir em `demandas`, query: `titulo ilike $1 AND cliente_id = $2 AND categoria = $3`. Se encontrar, vincula em vez de criar.

### 2.7 Atividades
Inserts em `atividade_cliente` (tipo `card_pai`) para: criação, etapa criada/excluída, tarefa real vinculada, status interno alterado, responsável alterado, etapa liberada/bloqueada/concluída, exclusão em lote.

---

## Garantias

- Nenhum arquivo de outras abas (Posts, Vídeos, Tráfego, LP, IA, Central de Tarefas) é tocado.
- Cards normais continuam usando o fluxo atual (`AreaTab` + `ProjetoKanban` + `DemandaDetalheDialog`).
- Toda lógica nova é isolada em arquivos novos (`store/cardPai.ts`, `components/projeto/cardPai/*`) e duas pequenas edições cirúrgicas em `AreaTab.tsx` (prop opcional) e `OperacionalTab.tsx` (dropdown + faixa de Cards Pai).
- Migração apenas **adiciona** tabelas/coluna; não altera nem remove dados existentes.

---

## Ordem de execução
1. Migração (tabelas, coluna, RLS, trigger de sincronização).
2. Store `cardPai.ts` + tipos.
3. UI: `CardPaiFormDialog`, `CardPaiDetalheDialog`, `CardsPaiLista`.
4. Edição cirúrgica em `OperacionalTab.tsx` (dropdown + faixa).
5. Edição cirúrgica em `AreaTab.tsx` (prop `allowBulkDelete` + botão + AlertDialog).
6. Ajuste `gerarEstruturaOperacional` para sugerir 4 Cards Pai sem duplicar.
7. Validação manual conforme checklist do pedido (itens 1–15 da seção VALIDAÇÃO).
