## Objetivo

Fazer o módulo lateral "Criar Tarefa" usar **exatamente o mesmo formulário** já existente nos cards do Projeto Completo (`DemandaDetalheDialog`), em vez de manter um formulário paralelo com layout próprio. Adicionar a etapa de "selecionar cliente" antes de abrir o formulário.

Sem mudanças em: cards do Projeto Completo, aba Posts, Kanbans, dashboards, Central de Tarefas, dados existentes.

## Como vai funcionar (fluxo do usuário)

1. Usuário clica em "Criar Tarefa" no menu lateral.
2. A página `/criar-tarefa` mostra um passo inicial pequeno e centralizado:
   - Combo **Cliente** (obrigatório, busca por nome).
   - Combo **Área / Categoria** (Posts, Vídeo, Tráfego Pago, Landing Page, IA Atendimento, Personalizado).
   - Botão **Continuar**.
3. Ao clicar em Continuar:
   - Se Categoria = "Posts": cria um post rascunho silencioso para o cliente (`createCardRascunho`) e abre o mesmo formulário usado hoje na aba Posts.
   - Caso contrário: cria uma demanda rascunho silenciosa (`createDemanda` com título "Sem título") para o cliente/categoria e abre o `DemandaDetalheDialog` com `isRascunho={true}`.
4. O usuário edita exatamente o mesmo formulário do Projeto Completo: título, status, urgência, subtipo, prioridade, datas, responsáveis, anexos, links Meister/Drive, briefing, comentários, IA Consulta, Workflow, histórico — tudo idêntico, porque é o mesmo componente.
5. Botão "Voltar" no topo:
   - Se o rascunho ficou vazio (sem título, sem descrição, sem anexos, sem responsáveis, sem datas, sem comentários) → descarta automaticamente (já é o comportamento atual de `isRascunho`).
   - Se foi preenchido → permanece salvo e o usuário é redirecionado para o Projeto Completo do cliente, na aba e tarefa correspondente.

## Mudanças técnicas

- `src/pages/CriarTarefa.tsx` — reescrever:
  - Remover todo o formulário customizado atual (campos duplicados, anexos locais, etc.).
  - Adicionar estado `step: 'select' | 'editing'` e `draftId` / `draftType`.
  - Passo `select`: card pequeno com selects de Cliente e Categoria + botão Continuar.
  - Passo `editing`:
    - Para demanda: renderizar `<DemandaDetalheDialog demanda={draftDemanda} isRascunho onOpenChange={...}/>` (já é um Dialog próprio, abre sobre a página).
    - Para post: navegar diretamente para `/clientes/{id}/projeto?tab=posts&post={id}` que já abre o formulário existente do post (mesma UX do Projeto Completo).
  - Ao fechar o dialog com conteúdo preenchido → `navigate` para o Projeto Completo na aba/tarefa criada.
  - Ao fechar vazio → o próprio `DemandaDetalheDialog` descarta o rascunho; voltamos para o passo `select`.

- Nenhuma alteração em `DemandaDetalheDialog.tsx`, `PostDetalhe.tsx`, stores, ou outros formulários.
- `TaskFormBase.tsx` permanece (usado por outros pontos), mas deixa de ser referenciado pelo Criar Tarefa global.

## Resultado

- Um único formulário de tarefa em todo o sistema (o do Projeto Completo).
- Seleção de cliente preservada como pré-requisito.
- Zero divergência visual entre "Criar Tarefa" e abrir um card no Projeto Completo.
