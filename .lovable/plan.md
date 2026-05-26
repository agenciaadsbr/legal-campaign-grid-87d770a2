# Plano: Generalizar controle de tempo em status + novos status com badges

## Visão geral
Reaproveitar a estrutura `approval_waiting_since` / `approval_waiting_by` / `approval_previous_status` (hoje só usada para "Aguardando aprovação do cliente") como **controle genérico de tempo em status monitorados**, renomeando as colunas da Central de Tarefas para "Entrada no status" e "Dias no status". Adicionar dois novos status (`Aguardando ação do cliente`, `Aguardando etapa interna`) com badges complementares customizáveis. Corrigir o bug de tarefas nascendo como "Atrasado".

Sem novas colunas na tabela. Sem alterar layout. Sem perder dados.

## Etapa 1 — Banco de dados (migração)

### 1.1 Novos valores no enum `demanda_status`
Adicionar (idempotente, mantendo todos os existentes):
- `Aguardando ação do cliente`
- `Aguardando etapa interna`
- `Aguardando etapa anterior` (caso não exista)

Os status atuais (`Criar`, `Planejamento`, `Revisar`, `Agendado`, `Postado`, `Atrasado`, `Concluido`, `Entregue`...) ficam intactos.

### 1.2 Reaproveitar colunas existentes
Não criar colunas novas. Continuar usando:
- `demandas.approval_waiting_since` → exibido como "Entrada no status"
- `demandas.approval_waiting_by`
- `demandas.approval_previous_status`

Adicionar **dois campos opcionais** já existentes na tabela? Não. Em vez disso, reusar `subtipo` (texto livre já existente) para guardar o badge selecionado quando o status for `Aguardando ação do cliente` / `Aguardando etapa interna`. Isso evita nova coluna. Se `subtipo` já tem outro uso conflitante, criamos uma única coluna `status_motivo text` (mínimo possível).

→ Verificar uso atual de `subtipo` antes de decidir. Se conflitar, criar `status_motivo`.

### 1.3 Generalizar o trigger `track_approval_status_demanda`
Substituir a verificação `NEW.status = 'Revisar'` por uma lista de status monitorados:
```
('Revisar', 'Aguardando ação do cliente', 'Aguardando etapa interna', 'Aguardando etapa anterior')
```
Mesma lógica para `cards` (trigger `track_approval_status_card`).

Comportamento:
- Entrou em status monitorado → grava `approval_waiting_since = now()`, `approval_previous_status = OLD.status`
- Mudou de um status monitorado para outro monitorado → atualiza timestamp para `now()` (reinicia contagem)
- Saiu para status não monitorado → limpa os campos

Dados antigos (`Revisar`) continuam funcionando — apenas a coluna passa a aparecer como "Entrada no status".

### 1.4 Corrigir lógica de "Atrasado"
Atualizar `auto_marcar_demanda_atrasada` e `marcar_demandas_atrasadas` para:
- Exigir que `now() - created_at >= interval '24 hours'` antes de marcar como atrasado.
- Excluir também os novos status monitorados de espera (`Aguardando ação do cliente`, `Aguardando etapa interna`, `Aguardando etapa anterior`) — eles têm controle próprio via "Dias no status".
- `Agendado`, `Postado`, `Concluido`, `Entregue` continuam excluídos.

### 1.5 Tabelas de badges customizáveis
Duas tabelas pequenas (espelho de `demanda_categorias_custom`):
- `status_motivo_cliente_custom` — badges para "Aguardando ação do cliente"
- `status_motivo_interno_custom` — badges para "Aguardando etapa interna"

Campos: `id, label, ordem, ativo, created_at`. Seed com os badges iniciais listados na spec. RLS: leitura para `authenticated`, escrita para `can_write`. GRANTs explícitos.

## Etapa 2 — Tipos e store frontend
- `src/store/demandas.ts`: adicionar os novos status ao enum/`StatusDemanda`. Adicionar campo `status_motivo` (ou usar `subtipo`).
- `src/lib/minhasTarefas.ts`:
  - Renomear conceitualmente `approval_waiting_since` → continua o mesmo campo, mas tratado para qualquer status monitorado (não só `Revisar`).
  - `approval_dias` calculado para todos os status monitorados.
- Criar `src/store/statusMotivos.ts` para CRUD dos badges customizáveis.

## Etapa 3 — UI

### 3.1 `MinhasTarefasTabela.tsx`
- Renomear cabeçalhos: "Entrada em aprovação" → "Entrada no status", "Dias em aprovação" → "Dias no status".
- Lógica de exibição: mostrar valor quando status atual estiver em `MONITORED_STATUSES`. Caso contrário, "—".
- Mesma posição/largura/estilo.

### 3.2 Detalhe da tarefa (`DemandaDetalheDialog`) + popovers de status
- `AlterarStatusPopover`: incluir os dois novos status na lista.
- Quando o status selecionado for `Aguardando ação do cliente` ou `Aguardando etapa interna`, mostrar um seletor compacto de badge (`Combobox`) com:
  - Lista carregada da respectiva tabela
  - Opção "+ Criar novo motivo" no rodapé (insert direto)
  - Salvo em `status_motivo` (ou `subtipo`)
- Badge complementar exibido discretamente abaixo do `StatusBadge` no card e no detalhe.

### 3.3 `StatusBadge.tsx`
- Adicionar cores/labels para os dois novos status (tokens semânticos).

### 3.4 Kanban / Posts / Projeto Completo
- `DemandasKanban` / `PostsKanbanCliente`: incluir colunas para os novos status (configurável). Como Posts não usa esses status novos, fica restrito a Demandas.
- Filtros e contadores em `MinhasTarefasFiltros` e `MinhasTarefas.tsx`: incluir os novos status no agrupamento "Aguardando".

### 3.5 Criação de tarefa
- `CriarTarefa.tsx` / `commitLocalRascunho` em `store/demandas.ts`: se `data_limite` ausente, definir como `created_at + 24h`. Validar que `data_limite >= now()` (ou ajustar com aviso `toast.info`).

## Etapa 4 — Configurações
Adicionar gerenciador de badges em `Configuracoes.tsx` (seção existente de "Demandas") — CRUD simples reutilizando o padrão de `ConfiguracoesDemandasManager`.

## Etapa 5 — Compatibilidade
- Dados antigos com `approval_waiting_since` preenchido para `Revisar` continuam intactos — apenas o label da coluna muda.
- Triggers e funções fazem fallback para o comportamento antigo.
- Nada é deletado.

## Pontos técnicos a confirmar antes de codar
1. Posso usar `subtipo` para armazenar o badge, ou crio uma coluna `status_motivo`? (recomendo `status_motivo` — mais limpo)
2. O `StatusDemanda` em TypeScript hoje é union literal — vou ampliá-lo. OK manter retrocompatibilidade com `Revisar` (continua existindo).
3. Os novos status entram **somente para Demandas** (não para Posts/`cards`), correto? Posts já tem fluxo próprio (`Criar`/`Revisar`/`Agendado`/`Postado`/`Atrasado`). Vou generalizar a coluna "Dias no status" só para Demandas e manter Posts como está, apenas renomeando o cabeçalho. Confirma?

## Entregáveis
- 1 migração SQL (enum + tabelas de motivos + triggers atualizados + GRANTs/RLS)
- Atualização de ~8 arquivos frontend (store, lib, tabela, popovers, kanban, filtros, criação, configurações)
- Sem alteração de layout, sem nova coluna na tabela visual, sem perda de dados

Aguardo confirmação dos 3 pontos técnicos para executar.
