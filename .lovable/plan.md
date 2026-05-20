## Fase 1 — Card Pai multietapa (apenas aba Operacional)

Esta fase converte o sistema paralelo de "Card Pai" em uma **tarefa normal com etapas internas**, reutilizando o modal `DemandaDetalheDialog` atual. Nenhum dado é apagado e nenhuma outra aba é alterada.

---

### 1. Modelo de dados (migração)

Adicionar colunas em `demandas` (sem quebrar nada existente):

- `is_card_pai BOOLEAN NOT NULL DEFAULT false` — marca a demanda como Card Pai (agrupador, não executa trabalho).
- `parent_process_id UUID` — id da demanda Card Pai (preenchido nas tarefas filhas).
- `process_step_order INT` — ordem da etapa dentro do Card Pai.
- `process_step_type TEXT` — `'tarefa'` ou `'status'`.
- `process_step_status TEXT` — `'bloqueada' | 'pendente' | 'em_execucao' | 'aguardando_aprovacao' | 'concluida' | 'atrasada'`.
- `process_depends_on UUID` — id da etapa anterior (auto-referência a `demandas.id`).
- `process_step_config JSONB DEFAULT '{}'` — flags: `reaproveitar_briefing`, `reaproveitar_anexos`, `reaproveitar_responsaveis`, `bloquear_ate_concluir`.

Trigger `auto_liberar_proxima_etapa()`:
- Em `UPDATE OF status` em `demandas`, quando `NEW.status IN ('Concluido','Entregue')` e a demanda tem `parent_process_id`, encontrar a próxima etapa (`process_depends_on = NEW.id`) e mudar `process_step_status` de `'bloqueada'` para `'pendente'`.

Etapas tipo `status` ficam como demandas com `process_step_type='status'`, `status='Planejamento'` (não aparecem em Kanban operacional pois filtraremos por `process_step_type <> 'status'` no Kanban — ou ficam ocultas via flag). Detalhe abaixo.

**Dados antigos `card_pai` / `card_pai_etapas`**: permanecem intactos no banco, apenas **deixam de ser lidos/renderizados**.

---

### 2. Remover UI antiga do Card Pai (sem apagar dados)

- `OperacionalTab.tsx`: remover `<CardsPaiLista>` do `extraTop` e remover o item "Novo Card Pai" do dropdown.
- `useCardPaiBootstrap` deixa de ser chamado nessa aba.
- Arquivos `cardPai/CardPaiUI.tsx` e `store/cardPai.ts` ficam no repositório (não são apagados) mas não são mais importados pela aba Operacional.

---

### 3. Novo botão "+ Card Pai" na aba Operacional

Em `AreaTab` (ou via `novaTarefaExtra` em `OperacionalTab`): ao lado de "+ Nova tarefa", adicionar **"+ Card Pai"**. Ao clicar, abre o **mesmo** `TaskFormBase` (modo demanda) com:
- `is_card_pai = true` no payload de criação.
- Categoria fixa `Operacional`.

---

### 4. Modal atual com modo Card Pai

`DemandaDetalheDialog` (e `TaskFormBase` quando aplicável):
- Se `demanda.is_card_pai`:
  - Mostra badge **"Card Pai"** no topo.
  - Mostra subtítulo "Processo multi-etapa com dependências internas."
  - **Substitui** a seção "Workflow / Continuidade" pelo bloco **"Etapas do Processo"** descrito abaixo.
- Caso contrário: modal continua **idêntico**.

---

### 5. Bloco "Etapas do Processo" (dentro do modal)

Renderiza `demandas WHERE parent_process_id = <card-pai-id> ORDER BY process_step_order`.

Cada linha mostra ícone de status (✓ ⏳ 🔒 ▶ ⚠), título, responsável, badge "Tarefa"/"Status", e ações:
- **Tarefa**: botão "Abrir tarefa" → abre `DemandaDetalheDialog` da etapa.
- **Status**: botão "Concluir etapa" (manual) — para "Aguardando aprovação do cliente" o usuário decide quando concluir.
- "Liberar manualmente" se bloqueada.
- Botão remover etapa (admin).

Botão **"+ Adicionar etapa"** abre formulário inline com os campos da tabela do briefing:
- Tipo (tarefa/status), Título, Área destino (categoria), Subtipo, Responsável, Depende de (etapa anterior), Bloquear até concluir, Reaproveitar briefing/anexos/responsáveis.

Ao salvar uma etapa, cria uma **`demanda` normal** com `parent_process_id`, herdando cliente, briefing/anexos/responsáveis se as flags estiverem ativas. Se `process_depends_on` está setado e essa dependência não está concluída → `process_step_status='bloqueada'`. Senão → `'pendente'`.

---

### 6. Compatibilidade Kanban e Central de Tarefas

- **Kanban Operacional**: continua mostrando todas as demandas da categoria. Card Pai aparece com badge "Card Pai". Etapas do tipo `status` ficam ocultas no Kanban (filtro `process_step_type !== 'status'`). Etapas do tipo `tarefa` aparecem normalmente.
- **Central de Tarefas (MinhasTarefas)**: continua puxando demandas normalmente. Etapas do tipo `status` são filtradas (não são trabalho real). Etapas do tipo `tarefa` aparecem para os responsáveis.
- **Regra "Aguardando aprovação do cliente"**: continua **manual** (já implementado anteriormente).

---

### 7. Geração automática — templates iniciais

Atualizar `gerarEstruturaOperacional`:
- Adicionar 2 novos templates de Card Pai (idempotentes via título + flag):
  - **"Ativar Campanha Google Ads"** com etapas: Criar LP (Bruno, LpSite), Aprovação Cliente LP (status), Configurar Domínio (Erick, LpSite), Configurar Tags/Pixels (Erick, LpSite), Ativar Campanha (Gleice, TrafegoPago).
  - **"Ativar Campanha Meta Ads"** com etapas: Criar anúncio (Lorenzo OU Bianca), Aprovação Cliente (status), Ativar Campanha (Gleice, TrafegoPago).
- Mapeamento de responsáveis usa busca por nome em `profiles` (fallback: deixa vazio).

---

### 8. Arquivos tocados (resumo técnico)

- **Migração SQL**: novas colunas + trigger `auto_liberar_proxima_etapa`.
- `src/store/demandas.ts`: tipo `Demanda` + helpers `getEtapas`, `getCardPai`.
- `src/components/projeto/OperacionalTab.tsx`: remover bloco Cards Pai antigos; adicionar botão "+ Card Pai".
- `src/components/projeto/AreaTab.tsx`: aceitar prop para botão extra de Card Pai.
- `src/components/demandas/DemandaDetalheDialog.tsx`: badge "Card Pai", subtítulo, render do bloco "Etapas do Processo" quando `is_card_pai`.
- `src/components/demandas/EtapasProcesso.tsx` (**novo**): componente do bloco com lista de etapas + form de adicionar.
- `src/components/tarefas/TaskFormBase.tsx`: aceitar `isCardPai` na criação.
- `src/components/demandas/DemandasKanban.tsx` / `MinhasTarefas`: filtros para esconder etapas `status`.
- `src/store/operationalTemplates.ts`: novos templates "GoogleAds" e "MetaAds" como Card Pai com etapas.

---

### 9. Não-objetivos desta fase

- Não mexer em comentários, anexos, IA, histórico, alertas, briefing.
- Não mexer nas outras abas (Posts, Vídeos, Tráfego, LP/Site, IA, Personalizado, Urgência).
- Não migrar dados antigos de `card_pai` para o novo modelo.
- Não tocar em Configurações de Estruturas Automáticas (UI).

---

### Testes manuais

1. Criar Card Pai via novo botão → abre modal padrão com badge.
2. Adicionar etapas tarefa/status com dependências.
3. Etapas dependentes aparecem 🔒.
4. Concluir etapa → próxima libera automaticamente.
5. Etapa tarefa aparece na aba destino e na Central de Tarefas do responsável.
6. Etapa status NÃO aparece no Kanban nem na Central.
7. "Gerar estrutura operacional" cria os 2 Cards Pai novos sem duplicar.
8. Tarefas normais (não-Card-Pai) continuam idênticas.
9. Bloco antigo "Cards Pai" não aparece mais; dados antigos preservados no banco.
