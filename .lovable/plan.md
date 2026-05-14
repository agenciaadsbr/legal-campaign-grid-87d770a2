## Resumo do bug
O módulo "Criar Tarefa" cria um rascunho de demanda no `useEffect` de inicialização — usando o **primeiro cliente da lista** (Lucas Carvalho Advocacia) e a categoria **Personalizado** — só para conseguir renderizar o `DemandaDetalheDialog`, que exige um objeto `Demanda` real. Quando o usuário fecha a tela sem preencher nada, o auto-descarte do diálogo nem sempre acontece (rascunhos com responsáveis pré-preenchidos, com mudanças de categoria ou em corridas de timer não são apagados), e o `handleDialogClose` ainda redireciona para o Projeto Completo do cliente do rascunho — gerando os cards "Sem título / Urgência / Outro" no cliente errado.

A correção é tornar a criação do rascunho **sob demanda** (somente após o usuário escolher Cliente **e** Área manualmente) e blindar o fechamento para nunca redirecionar a um cliente que o usuário não escolheu explicitamente.

## Alterações (somente em `src/pages/CriarTarefa.tsx`)

### 1. Remover criação automática no carregamento
- Apagar o `useEffect` que chama `createRascunho` com o primeiro cliente.
- Remover o `initRef`. O `clienteId` e `area` continuam iniciando vazios (já estão).
- Sem rascunho no mount → nada é gravado no banco ao abrir o módulo.

### 2. Render condicional do formulário
- Enquanto não houver `draftId`, renderizar **apenas** o bloco `headerExtras` (selects de Cliente e Área) dentro de um container simples, com uma mensagem discreta tipo "Selecione um cliente e uma área/categoria para começar".
- Assim que o usuário escolher **ambos** (Cliente preenchido **e** Área diferente de "Posts" e diferente de vazio), criar o rascunho de demanda e passar a renderizar o `DemandaDetalheDialog` completo (mesmo layout atual).
- Para "Posts": só navegar para o fluxo de Posts depois que o usuário escolher Cliente **e** clicar em "Posts" na Área. Se Cliente estiver vazio, exibir toast e reverter o select.

### 3. Lógica de troca de Cliente / Área
- `handleClienteChange`: apenas atualiza o estado local. Se já existe `draftId`, propaga o novo `cliente_id` para o rascunho. Se ainda não existe e a Área já está escolhida, cria o rascunho agora.
- `handleAreaChange`: mesma lógica espelhada — só cria rascunho quando Cliente também já estiver escolhido.

### 4. Fechamento sempre seguro
- Reescrever `handleDialogClose` para:
  - Se houver `draftId`, **sempre** chamar `deleteDemanda(draftId)` (descarte explícito), independente de o auto-descarte do diálogo já ter rodado. Como o rascunho só é criado quando o usuário escolheu Cliente + Área manualmente, e o usuário ainda não clicou em "Salvar tarefa" (que é o `Salvar` que vai virar o submit), o conteúdo deve ser descartado.
  - **Nunca** redirecionar para `/clientes/{id}/projeto`. Sempre `navigate(-1)`.
- Remover toda a lógica que olha o store e redireciona para a aba do cliente após fechar.

### 5. Remover fallback ao primeiro cliente
- Não há mais nenhuma referência a `clientes[0]`. Cliente vazio = sem rascunho = sem tarefa.

### 6. Proteção contra duplo salvamento
- O botão "Salvar tarefa" do `DemandaDetalheDialog` é o existente; o submit real do rascunho é feito pelo próprio diálogo (que já persiste título/descrição via `updateDemanda`). Como o requisito pede que a criação só aconteça no submit, vamos manter a semântica atual: o rascunho criado após Cliente+Área é a entidade que o usuário está editando; ao fechar **sem salvar** ele é descartado pelo passo 4. Não há mudança de fluxo no diálogo.

## O que NÃO muda
- `DemandaDetalheDialog.tsx`, `PostDetalhe.tsx`, `WorkflowSection.tsx`, `TaskFormBase.tsx`.
- Stores (`demandas`, `crm`), kanbans, dashboards, Projeto Completo, Clientes, Minhas Tarefas, Central de Tarefas.
- Layout/campos do formulário — segue idêntico ao do Projeto Completo, com o header extra de Cliente + Área.
- Dados existentes no banco (cards já criados pelo bug não são apagados automaticamente — usuário remove manualmente, conforme item 10 do pedido).

## Resultado esperado
- Abrir "Criar Tarefa" → nenhuma chamada ao banco, nenhum card criado.
- Fechar/voltar/clicar fora sem preencher → nada é criado, nenhum redirecionamento para Lucas Carvalho.
- Selecionar Cliente + Área → o formulário completo aparece com o rascunho real.
- Fechar sem salvar título → rascunho é descartado.
- Salvar com título → tarefa criada normalmente no cliente/aba escolhidos pelo usuário.
