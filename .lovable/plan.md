# Tornar "Aguardando aprovação do cliente" exclusivamente manual

## Contexto da investigação

- Status interno no banco continua sendo `Revisar` (em `demanda_status` e em `cards.status`). Apenas o rótulo visível mudou para "Aguardando aprovação do cliente".
- Auditoria das 8 demandas e 20 cards atualmente em "Revisar": todas têm histórico manual (`historico_demandas` com `usuario_id` preenchido). Logo, **dados existentes não serão alterados**.
- Não existe hoje, em `src/` ou nos triggers, código que defina `Revisar` automaticamente. Mas vamos blindar o sistema para garantir que isso continue assim, conforme pedido.

## Mudanças (não removem layout, kanban, central de tarefas, status, nem dados)

### 1. Guard no banco — proibir INSERT com status Revisar

Migração nova com dois triggers `BEFORE INSERT`:

- `demandas`: se `NEW.status = 'Revisar'` no INSERT, força `NEW.status := 'Criar'` (status seguro padrão do fluxo). Isso protege qualquer rotina futura (estrutura operacional, card pai, ciclo, duplicação, import) de criar tarefa já em aprovação.
- `cards`: se `NEW.status = 'Revisar'` no INSERT, força `NEW.status := 'Criar'`. Protege ciclo de posts, criação em lote, geração via card pai e workflow.

Esses guards não afetam UPDATEs (a transição manual via Kanban / formulário continua funcionando exatamente como hoje).

### 2. Guard no frontend — não permitir criar tarefa já em aprovação

Locais que hoje têm um Select de status no formulário de **criação** de tarefa/card:

- `src/components/tarefas/TaskFormBase.tsx` — quando estiver em modo "novo" (sem `id`), remover a opção `Revisar` do select de status (apenas no momento da criação). Em modo edição, a opção continua disponível (mudança manual permitida).
- `src/components/clientes/PostsKanbanCliente.tsx` — botão/dialog de "Novo post" parte de `Planejamento`/`Criar` por padrão; garantir que o status inicial nunca seja `Revisar`.
- Demais fluxos de criação automática já usam `Planejamento`/`Criar` (`src/store/crm.ts`, `src/store/operationalTemplates.ts`, `src/store/cardPai.ts`, `src/store/demandas.ts`) — apenas conferir e adicionar fallback defensivo onde necessário.

### 3. Reforço dos triggers já existentes

`track_approval_status_demanda` e `track_approval_status_card` já só preenchem `approval_waiting_since` em `BEFORE UPDATE OF status` quando há transição real (`OLD.status IS DISTINCT FROM NEW.status`). Nenhuma alteração necessária — apenas confirmar em comentário que o preenchimento de `approval_waiting_since` jamais ocorre em INSERT.

### 4. Central de Tarefas

`src/lib/minhasTarefas.ts` já só classifica como `aprovacao` quando `d.status === 'Revisar'` e só lê `d.approval_waiting_since` do banco (nunca calcula a partir de data futura). Combinado com o guard de INSERT acima, fica garantido que nenhuma tarefa futura sem ação manual aparece como "Aguardando aprovação do cliente". Nenhuma mudança de lógica necessária.

### 5. Atividade

Os logs em `atividade_cliente` já são gerados pelo trigger de update:
- entrada: "Tarefa movida para Aguardando aprovação do cliente."
- saída: "Tarefa saiu de Aguardando aprovação do cliente após X dia(s)."

Mantidos exatamente como estão.

### 6. Dados existentes

Mantidos. Conforme você pediu, as 8 demandas + 20 cards em Revisar permanecem (todas têm histórico manual válido).

## Resumo dos arquivos tocados

- **nova migração SQL** (guard de INSERT em `demandas` e `cards`)
- `src/components/tarefas/TaskFormBase.tsx` — esconder opção "Revisar" só no modo criação
- `src/components/clientes/PostsKanbanCliente.tsx` — garantir status inicial seguro ao criar post (defensivo)

## Validação manual após implementar

1. Criar nova demanda via formulário → não pode ser salva como Revisar (opção oculta na criação).
2. Tentar (via console/SQL) `INSERT INTO demandas (..., status) VALUES (..., 'Revisar')` → resultado salvo como `Criar`.
3. Rodar "Gerar estrutura operacional" → nenhum item criado em Revisar.
4. Criar ciclo de posts → todos os cards iniciam em `Planejamento`/`Criar`.
5. Mover tarefa manualmente no Kanban para "Aguardando aprovação do cliente" → `approval_waiting_since` é preenchido, atividade registrada.
6. Mover de volta → `approval_waiting_since` limpo, atividade de saída registrada com contagem de dias.
7. Central de Tarefas continua mostrando apenas tarefas que estão em Revisar (manualmente movidas).
