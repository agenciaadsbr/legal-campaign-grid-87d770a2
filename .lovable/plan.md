## Problema

Na aba **Posts** do cliente, o botão "Adicionar Tarefa" não está funcionando como esperado. Após análise:

1. **Causa do "não funcionar":** o fluxo `handleAdicionarTarefa` em `src/components/clientes/PostsKanbanCliente.tsx` chama `createCardRascunho` (que cria card + post no Supabase) e em seguida navega para `/clientes/:id/posts/:postId?focus=titulo`. Porém o título salvo no banco é `Post Mês X - Semana Y` (placeholder), o que faz o card aparecer no Kanban com o texto "Definir título da tarefa" em itálico — visualmente parece que "nada aconteceu" se o usuário não percebe a navegação para o detalhe do post.

2. **Pedido do usuário:** todo card novo criado pelo botão deve já vir com o título **"Criar Post"** (em vez do placeholder `Post Mês X - Semana Y`). A edição do título passa a ser feita dentro dos detalhes da tarefa, não mais forçada na criação.

## O que fazer

### 1. `src/store/crm.ts` — função `createCardRascunho` (linhas ~782-839)

- Trocar o título inserido no `cards` e no `posts` de `` `Post Mês ${mes} - Semana ${semana}` `` para a constante **`"Criar Post"`**.
- Manter o cálculo de `posicao`, `mes_referencia` e `numero_semana` como está (eles ainda são úteis para organização e exibição do "Post Mês X · Semana Y" no rodapé do card).

### 2. `src/components/clientes/PostsKanbanCliente.tsx`

- **`handleAdicionarTarefa`** (linha ~409): após criar o card, **não navegar mais automaticamente** para a tela de detalhe com `?focus=titulo`. Em vez disso:
  - Mostrar um `toast.success("Tarefa criada")`.
  - O card aparece imediatamente na coluna "Planejamento" (já há `_loadAll` ao final do `createCardRascunho`).
  - O usuário clica no card quando quiser editar título/detalhes.
- **`CardItem`** (linhas ~62-66, 173-186): ajustar a regra `isPlaceholderTitulo` para reconhecer também `"Criar Post"` como título "padrão editável" — assim continua funcionando o clique inline para editar o título no card, e o estilo em itálico não aparece (já que "Criar Post" é um título válido). Concretamente: remover o tratamento "Definir título da tarefa" e simplesmente exibir `card.titulo_card` normalmente; manter o `startEdit` no clique para edição inline do título.
- **`onDragEnd`** (linhas ~429-434): remover o auto-redirect/foco no título ao mover um card de "Planejamento" para outra coluna. O título "Criar Post" já é válido, então não precisamos mais "forçar" o usuário a renomear.
- **Botão "Iniciar tarefa"** dentro de cards em Planejamento (linhas ~228-243): manter, mas o `onIniciar` agora apenas abre o detalhe do post sem `focusTitulo`.

### 3. Migração de dados (opcional, **não incluída** por padrão)

Cards antigos com título no formato `Post Mês X - Semana Y` continuarão como estão. Se o usuário quiser, podemos rodar um `UPDATE cards SET titulo = 'Criar Post' WHERE titulo ~ '^Post Mês \d+ - Semana \d+$'` em uma migração separada — não vou fazer isso agora para não alterar dados existentes sem confirmação.

## Resumo

- Botão "Adicionar Tarefa" passa a criar o card com título **"Criar Post"** e exibi-lo direto no Kanban (com toast de confirmação), sem redirecionar.
- Título pode ser editado clicando no card (inline) ou abrindo os detalhes da tarefa.
- Sem mudanças no schema do banco; sem mudanças nas RLS.
