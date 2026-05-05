## Objetivo

Adicionar duas funções **apenas na parte externa dos cards** (visualização do kanban) nas abas do **Projeto Completo** — Posts, Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Urgências:

1. **Selecionar cards** individualmente (checkbox no card) **ou todos os cards** do kanban.
2. **Atribuir os cards selecionados a um ou mais responsáveis** sem precisar abrir nenhum card.

## Escopo — o que NÃO muda

- O **formulário interno do card** (`DemandaDetalheDialog` para demandas e `PostDetalhe` para posts) permanece **exatamente como está hoje**. Nenhuma alteração de campos, layout ou comportamento dentro do card aberto.
- Edição responsável-a-responsável dentro do card continua funcionando normalmente.
- Drag & drop entre colunas continua funcionando no modo normal (só fica desabilitado enquanto o usuário está em "modo seleção", para não conflitar).

## Como vai funcionar (visão do usuário)

**No header de cada aba (parte externa, acima do kanban):**

- Novo botão **"Selecionar"** ao lado dos filtros. Ao clicar, entra em **modo de seleção**:
  - Cada card do kanban exibe um **checkbox no canto superior direito** (apenas visual externo do card).
  - O header passa a mostrar uma barra de ações:
    `[ ] Selecionar todos · X selecionados · [Atribuir responsáveis ▾] · [Limpar] · [Sair]`
  - Enquanto o modo seleção está ativo, **clicar no card alterna a seleção** (não abre o detalhe). Drag & drop fica desabilitado nesse modo.
- Botão **"Atribuir responsáveis"** abre um popover com:
  - Modo `Substituir` (troca os responsáveis atuais) ou `Adicionar` (mantém os atuais e adiciona novos).
  - Lista de membros com checkbox + avatar + nome (multi-seleção).
  - Botão `Aplicar (X tarefas)`.
- Após aplicar: toast `X tarefas atualizadas`, sai automaticamente do modo seleção, kanban atualiza.

## Mudanças técnicas (apenas componentes externos do kanban)

### 1. `src/components/demandas/DemandCard.tsx` (visual externo do card)
- Novas props **opcionais**: `selectionMode?: boolean`, `selected?: boolean`, `onToggleSelect?: () => void`.
- Quando `selectionMode === true`:
  - Renderiza `Checkbox` no canto superior direito.
  - `onClick` chama `onToggleSelect` em vez do onClick original.
  - `draggable` é forçado a `false`.
  - Borda destacada (`ring-2 ring-primary`) quando `selected`.
- Quando `selectionMode` é `false`/ausente: comportamento idêntico ao atual.

### 2. `src/components/demandas/ProjetoKanban.tsx` (e `DemandasKanban.tsx` por paridade)
- Novas props opcionais: `selectionMode`, `selectedIds: Set<string>`, `onToggleSelect: (id) => void`.
- Repassa para cada `DemandCard`.
- Quando `selectionMode` ativo, ignora handlers de drop nas colunas.

### 3. `src/components/projeto/AreaTab.tsx` (header da aba — externo)
- Estado novo: `selectionMode`, `selectedIds: Set<string>`.
- Botão `Selecionar` no header alterna o modo.
- Quando ativo: barra de ações com checkbox "Selecionar todos", contador, popover de atribuição, botões Limpar/Sair.
- Abertura do `DemandaDetalheDialog` só ocorre quando `!selectionMode` — o dialog em si **não é tocado**.

### 4. `src/components/clientes/PostsKanbanCliente.tsx` (header e cards externos da aba Posts)
- Mesma lógica aplicada aos cards de Posts.
- Atribuição em massa usa a função do store `useCRM` que já atualiza `cards.responsaveis_ids`.
- A página `PostDetalhe.tsx` **não é alterada**.

### 5. Novo componente `src/components/demandas/AtribuirResponsaveisPopover.tsx`
- Reutilizável entre AreaTab e PostsKanbanCliente.
- Props: `responsaveis`, `count`, `onApply: (ids, modo) => Promise<void>`.
- UI: Popover com toggle Substituir/Adicionar + lista com checkboxes + botão Aplicar.

### 6. Lógica de aplicação em massa (dentro de AreaTab e PostsKanbanCliente)

```ts
async function aplicarResponsaveis(novosIds: string[], modo) {
  await Promise.all(
    Array.from(selectedIds).map((id) => {
      const atual = itens.find((d) => d.id === id);
      const finalIds = modo === "substituir"
        ? novosIds
        : Array.from(new Set([...(atual?.responsaveis_ids ?? []), ...novosIds]));
      return updateDemanda(id, { responsaveis_ids: finalIds });
      // PostsKanban: updateCard(id, { responsaveis_ids: finalIds })
    })
  );
  toast({ title: `${selectedIds.size} tarefas atualizadas` });
  setSelectionMode(false);
  setSelectedIds(new Set());
}
```

### 7. `public/version.json`
- Bump de timestamp para forçar refresh no cliente.

## Arquivos afetados

- `src/components/demandas/DemandCard.tsx` (editado — visual externo)
- `src/components/demandas/ProjetoKanban.tsx` (editado)
- `src/components/demandas/DemandasKanban.tsx` (editado — paridade)
- `src/components/projeto/AreaTab.tsx` (editado — header)
- `src/components/clientes/PostsKanbanCliente.tsx` (editado — header e cards)
- `src/components/demandas/AtribuirResponsaveisPopover.tsx` (novo)
- `public/version.json` (bump)

**Não tocados:** `DemandaDetalheDialog.tsx`, `PostDetalhe.tsx`, store de demandas, schema do banco.

## Fora de escopo

- Outras ações em massa (mudar status, prioridade, excluir) — possível próxima iteração.
- Atalhos de teclado (Shift+click range) — possível próxima iteração.
