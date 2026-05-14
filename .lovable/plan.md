
## Objetivo

Eliminar a tela intermediária ("Continuar") em `/criar-tarefa`. A página deve abrir já com o formulário completo idêntico ao usado nos cards do Projeto Completo, com apenas dois campos extras no topo: **Cliente** e **Área / Categoria**.

Sem alterar o comportamento do formulário original em nenhum outro lugar do sistema.

---

## Estratégia

1. Ao montar `CriarTarefa`, criar imediatamente um **rascunho silencioso** (igual ao que o Projeto Completo já faz quando se clica em "Adicionar tarefa").
   - Categoria padrão: `Personalizado` (Urgências) → trocada na hora pelo seletor de Área no topo.
   - Cliente padrão: o primeiro cliente disponível → trocado na hora pelo seletor de Cliente no topo.
   - O rascunho não polui o sistema: a lógica de descarte automático (já existente em `DemandaDetalheDialog` quando `isRascunho` e o título permanece vazio sem conteúdo) cuida da limpeza ao sair sem preencher.

2. Renderizar o **mesmo `DemandaDetalheDialog`** já usado no Projeto Completo, em modo `isRascunho`, recebendo esse rascunho. Ele já traz por padrão:
   - Título, Urgente, Status, Categoria, Subtipo, Prioridade
   - Datas, Responsáveis, Anexos, Link Meister, Link Drive
   - Briefing/Descrição, Comentários
   - "Está com dúvidas na tarefa? Consulte aqui" (`TarefaIAConsulta`)
   - Workflow / Continuidade (`WorkflowSection`)
   - Salvar (autosave) / fechar

3. Adicionar **dois campos no topo** acima do conteúdo do diálogo:
   - **Cliente** (Select obrigatório) → ao alterar, dispara `updateDemanda(rascunho.id, { cliente_id })`.
   - **Área / Categoria** (Select obrigatório) → ao alterar para uma categoria de demanda, dispara `updateDemanda(rascunho.id, { categoria })`.
   - Se a Área for **Posts**: descarta o rascunho de demanda e cria um rascunho de card via `createCardRascunho` do CRM, comutando o formulário renderizado abaixo para `PostDetalhe` (mesmo formulário usado dentro da aba Posts do Projeto Completo). Ao trocar de Posts para qualquer outra área, faz o caminho inverso.

4. Para expor esses dois campos no topo **sem recriar nem modificar o formulário original**, adicionar uma única prop opcional `headerExtras?: ReactNode` em `DemandaDetalheDialog` (slot puro, renderizado no topo do `DialogContent`). Nenhum comportamento existente muda; outras chamadas continuam funcionando sem alteração porque a prop é opcional.

5. Validação de salvamento: como o formulário usa autosave, o "Salvar tarefa" do rascunho é o próprio comportamento atual. As mensagens obrigatórias pedidas pelo usuário aparecem caso ele tente sair/fechar com Cliente vazio ou sem Área válida; nesse caso bloqueamos o descarte e mostramos:
   - "Selecione um cliente para criar a tarefa."
   - "Selecione uma área/categoria para criar a tarefa."

---

## Mudanças por arquivo

### `src/components/demandas/DemandaDetalheDialog.tsx`
- Adicionar prop opcional `headerExtras?: ReactNode`.
- Renderizá-la no topo do `DialogContent` (logo antes do bloco de título).
- Nenhuma outra alteração — todas as chamadas existentes seguem funcionando exatamente como hoje.

### `src/pages/CriarTarefa.tsx` (reescrita)
- Remove o fluxo em duas etapas (sem `step`, sem botão "Continuar", sem tela de seleção).
- `useEffect` no mount: cria rascunho com `createRascunho({ cliente_id: primeiroCliente, categoria: "Personalizado" })`.
- Estado: `mode: "demanda" | "post"`, `demandaDraftId`, `postDraftId`.
- Renderiza:
  - Se `mode === "demanda"`: `<DemandaDetalheDialog demanda={liveDraft} isRascunho onOpenChange={...} headerExtras={<ClienteAreaSelectors/>} />`
  - Se `mode === "post"`: layout análogo embutindo `PostDetalhe` para o card rascunho (com os mesmos dois selects no topo).
- Handlers:
  - `onClienteChange(novoId)` → `updateDemanda(draftId, { cliente_id: novoId })` ou `updateCard` equivalente para Post.
  - `onAreaChange(novaArea)`:
    - se "Posts" e `mode === "demanda"` → `deleteDemanda(draftId)` + `createCardRascunho` + `setMode("post")`.
    - se categoria de demanda e `mode === "post"` → descartar card rascunho + `createRascunho` + `setMode("demanda")`.
    - se categoria de demanda e `mode === "demanda"` → `updateDemanda(draftId, { categoria: novaArea })`.
- `onOpenChange(false)`: se rascunho ainda existir no store (foi preenchido), redireciona para o Projeto Completo na aba correta (`categoriaParaAba` ou `tab=posts`); se foi descartado silenciosamente, volta para a rota anterior.

### Não mexer
- `PostDetalhe.tsx`, `WorkflowSection.tsx`, `TarefaIAConsulta.tsx`, `TaskFormBase.tsx`, stores, kanbans, dashboards, Central de Tarefas, Minhas Tarefas, dados existentes.

---

## Validação

1. Abrir `/criar-tarefa` → o formulário completo aparece imediatamente, sem botão "Continuar" e sem etapa separada.
2. Cliente e Área aparecem no topo, integrados ao mesmo formulário.
3. IA ("Está com dúvidas...") e Workflow aparecem desde o início.
4. Trocar Área para "Posts" → o formulário comuta para o de Posts (campos extras: data agendamento, postagem, link Meta, legenda) sem recarregar a página.
5. Salvar tarefa de Tráfego Pago → aparece no cliente correto, na aba correta, na Central de Tarefas, no Dashboard e (se aplicável) em Alertas.
6. Salvar tarefa de Posts → aparece na aba Posts do cliente correto.
7. Nada no Projeto Completo, Kanbans ou demais módulos é alterado.
