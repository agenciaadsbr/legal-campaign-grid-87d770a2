## Objetivo

No módulo "Criar Tarefa", os campos **Cliente \*** e **Área / Categoria \*** devem iniciar **vazios**, exigindo seleção manual do usuário antes de exibir o formulário completo.

## Comportamento atual (bug)

Ao abrir `/criar-tarefa`:
- `clienteId` é preenchido automaticamente com o primeiro cliente da lista.
- `area` inicia como `"Personalizado"`.
- Um rascunho de demanda é criado silenciosamente no `useEffect` de inicialização.

## Comportamento desejado

- Ambos os selects iniciam vazios (placeholder visível).
- O formulário completo (`DemandaDetalheDialog` ou fluxo de Posts) só aparece **depois** que o usuário escolhe Cliente **e** Área.
- Nenhum rascunho é criado antes dessa escolha (evita lixo no banco e no histórico).
- Nada muda fora do módulo "Criar Tarefa".

## Mudanças (apenas em `src/pages/CriarTarefa.tsx`)

1. **Remover a inicialização automática**
   - Apagar o `useEffect` que seta o primeiro cliente e cria o rascunho.
   - `clienteId` inicia como `""`, `area` inicia como `"" as AreaSel | ""`.

2. **Criar o rascunho sob demanda**
   - Novo `useEffect` que dispara apenas quando `clienteId !== ""` **e** `area !== ""` **e** `area !== "Posts"` **e** `draftId === null`.
   - Esse efeito chama `createRascunho({ cliente_id, categoria: area })` e guarda `draftId`.
   - Para `area === "Posts"`: ao selecionar, se `clienteId` já existir, dispara `createCardRascunho` + navegação para o Projeto Completo (mesmo fluxo já existente). Se `clienteId` ainda estiver vazio, apenas registra a escolha e aguarda o cliente.

3. **Ajustar `handleClienteChange` e `handleAreaChange`**
   - Atualizam o estado local sempre.
   - Só chamam `updateDemanda` se já existir `draftId`.
   - Se ainda não há rascunho, o `useEffect` do passo 2 cuida de criar quando os dois campos estiverem preenchidos.
   - Mantém a lógica atual de troca entre Posts ↔ demanda (deletar rascunho de demanda ao virar Post, etc.).

4. **Renderização condicional**
   - Enquanto `clienteId === ""` ou `area === ""`: renderiza apenas o cabeçalho com os dois selects (placeholders visíveis) e uma mensagem discreta tipo "Selecione cliente e área para começar".
   - Quando ambos estão preenchidos e `liveDraft` existe: renderiza `<DemandaDetalheDialog ... headerExtras={...} />` exatamente como hoje.
   - O `headerExtras` continua o mesmo (selects no topo do dialog), garantindo que a UX permaneça idêntica após o preenchimento.

5. **`handleDialogClose`**
   - Mantém comportamento atual (se draft existe, navega para o Projeto Completo; senão, `navigate(-1)`).
   - Como agora o draft só nasce após seleção manual, fechar sem ter selecionado nada simplesmente volta para a rota anterior sem criar lixo.

## Fora do escopo (não tocar)

- `DemandaDetalheDialog.tsx` (já recebe `headerExtras`).
- `PostDetalhe.tsx`, `TaskFormBase.tsx`, `WorkflowSection.tsx`, `TarefaIAConsulta.tsx`.
- Stores (`demandas`, `crm`), kanbans, Central de Tarefas, Minhas Tarefas, dashboards.
- Layout geral do sistema.

## Validação

1. Abrir `/criar-tarefa` → ambos os selects vazios, mostrando placeholders.
2. Nenhum rascunho criado no store antes da seleção.
3. Selecionar só Cliente → ainda sem formulário.
4. Selecionar Área (não-Posts) → rascunho criado, formulário completo aparece.
5. Selecionar "Posts" com cliente preenchido → navega para o Projeto Completo (Posts), como hoje.
6. Fechar sem preencher → volta sem deixar rascunho.
7. Conferir que cards do Projeto Completo, Kanbans e demais módulos seguem inalterados.
