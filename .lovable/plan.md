## Causa raiz

A etapa 4 do modelo Meta Ads (`statusInicial: "Aguardando etapa anterior"`) tenta inserir um valor que NÃO existe no enum `demanda_status` do banco (valores válidos: `Planejamento, Criar, Revisar, Entregue, Concluido, Atrasado`). Por isso a 4ª etapa falha silenciosamente tanto na criação inicial do Card Pai quanto no backfill — o card pai existente do cliente ficou com 3 etapas.

O rótulo visual "Aguardando etapa anterior" deve vir do `process_step_status = 'bloqueada'` (já tratado no UI), não do enum `status`.

## Correções

### 1. `src/lib/cardPaiTemplates.ts`
- Etapa 4 do modelo `meta_ads`: trocar `statusInicial: "Aguardando etapa anterior"` por `statusInicial: "Planejamento"`.
- O bloqueio visual continua via `bloqueada: true` + `dependsOnStepIndex: 2` (já implementado), que gera `process_step_status: "bloqueada"` na demanda.
- Não alterar o modelo `google_ads`.

### 2. `src/components/projeto/OperacionalTab.tsx` (backfill)
- O backfill já existe e cobre Card Pai antigo sem etapa 4. Com a correção do enum acima, o `createDemanda` deixa de falhar e a etapa será inserida no próximo carregamento da aba Operacional do cliente.
- Manter o `backfilledRef` por sessão; como ele zera a cada novo mount, o retry ocorre automaticamente após a correção.

### 3. (Opcional, defensivo) Normalizar status inválido em `criarCardPaiDeModelo` e no backfill
- Garantir que qualquer `statusInicial` que não seja um valor do enum caia para `"Planejamento"`. Evita reintroduzir o bug se um template futuro usar rótulo livre.

## O que NÃO muda
- Estrutura do Card Pai, Workflow / Etapas do Processo, layout do Detalhes da Tarefa.
- Modelo Google Ads.
- Trigger `auto_liberar_proxima_etapa` (já libera quando a etapa de aprovação for concluída).
- Dados existentes: o card pai atual e suas 3 etapas permanecem; apenas a 4ª passa a ser criada automaticamente.

## Verificação
1. Após a correção, abrir o cliente → aba Operacional → backfill cria a etapa "Ativar campanha Meta Ads" (TrafegoPago, Gleice, bloqueada, depende da aprovação).
2. Abrir o Card Pai existente → "Etapas do Processo (4)".
3. Concluir a etapa "Aguardando aprovação do cliente" → etapa 4 desbloqueia (process_step_status passa para `pendente`).
4. Etapa 4 aparece na aba Tráfego Pago e na Central de Tarefas da Gleice.
5. Criar um novo Card Pai Meta Ads → nasce já com as 4 etapas corretas.
