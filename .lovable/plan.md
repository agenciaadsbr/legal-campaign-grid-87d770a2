# Plano — Workflow / Continuidade para a aba Posts

## Objetivo

Habilitar, dentro do detalhe de um Post, a mesma funcionalidade de **Workflow / Continuidade** já usada nas demais áreas (criar próxima etapa que depende da conclusão da tarefa atual), porém adaptada à realidade da aba Posts, onde existem **dois papéis distintos**:

- **Responsáveis pela criação do post** (designer / quem produz)
- **Responsáveis pela postagem** (quem efetivamente publica nas redes)

Hoje o card "WORKFLOW / CONTINUIDADE" no detalhe do Post mostra apenas a mensagem _"Continuidade entre etapas está disponível para tarefas das demais áreas. Posts não possuem etapas vinculadas."_ — esse placeholder será substituído pela funcionalidade real.

Escopo: **somente a aba Posts**. Nenhuma alteração em Demandas, Projeto Completo, Kanbans ou outras áreas.

---

## Mudanças

### 1. Banco — novo campo para "responsáveis pela postagem"

Adicionar coluna `responsaveis_postagem uuid[]` (default `'{}'`) na tabela `cards`. O campo `responsaveis` existente continua representando os **responsáveis pela criação**. Sem migração de dados antigos (campo novo nasce vazio, totalmente compatível).

### 2. Detalhe do Post — dois blocos de responsáveis

Em `src/components/clientes/PostDetalheDialog.tsx`, na seção "Responsáveis" (Card 1):

- Renomear o bloco atual para **"Responsáveis pela criação"** (lê/grava `card.responsaveis`).
- Adicionar logo abaixo um segundo bloco **"Responsáveis pela postagem"** com o mesmo Popover de seleção, lendo/gravando `card.responsaveis_postagem`.
- Visual idêntico ao já existente (avatares coloridos + popover de toggle).

### 3. Substituir o placeholder pelo WorkflowSection real

Em `PostDetalheDialog.tsx`, remover o card placeholder "WORKFLOW / CONTINUIDADE" e renderizar `<WorkflowSection pai={demandaStub} />`, passando um stub `Demanda`-like construído a partir de `card` + `post` (categoria `"Posts"`, `cliente_id`, `id` = `card.id`, `descricao`, `link_meister`, `responsaveis`, etc.). O `WorkflowSection` já tem o branch `categoria === "Posts"` que cria um Card+Post via `createCardRascunho` e grava a dependência em `task_dependencies` — esse caminho passa a funcionar quando o **pai** também é um Post.

### 4. WorkflowSection — suportar dois responsáveis quando a próxima etapa for "Posts"

Em `src/components/demandas/WorkflowSection.tsx`:

- Quando `categoria === "Posts"` na próxima etapa, exibir **dois seletores de responsáveis** lado a lado: "Responsáveis pela criação" e "Responsáveis pela postagem" (estados separados `responsaveisCriacaoIds` e `responsaveisPostagemIds`).
- No `salvar()` do branch Posts, gravar `responsaveis: responsaveisCriacaoIds` e `responsaveis_postagem: responsaveisPostagemIds` no `updateCard`.
- "Herdar responsáveis" do pai: se o pai for um Post, herda os dois conjuntos respectivamente; se o pai for de outra área, herda apenas para "criação" (postagem fica vazia).
- Quando a próxima etapa **não** for Posts, o comportamento atual permanece intacto (um único bloco de responsáveis).

### 5. Compatibilidade

- Campo `responsaveis_postagem` é opcional e default `[]` — posts antigos continuam funcionando sem alteração.
- Nenhuma remoção de dados (legenda, anexos, comentários, status, datas, link Meta etc. permanecem).
- Nenhuma mudança em Kanbans, listagens, relatórios ou edge functions.

---

## Detalhes técnicos

**Arquivos alterados**

- `supabase/migrations/*` (nova): `ALTER TABLE public.cards ADD COLUMN responsaveis_postagem uuid[] NOT NULL DEFAULT '{}';`
- `src/store/crm.ts`: incluir `responsaveis_postagem` no tipo `Card`, no fetch e no `updateCard`.
- `src/components/clientes/PostDetalheDialog.tsx`:
  - novo bloco "Responsáveis pela postagem";
  - troca do placeholder por `<WorkflowSection pai={demandaStub} />`;
  - `demandaStub` passa a expor `responsaveis` e `responsaveis_postagem` para herança.
- `src/components/demandas/WorkflowSection.tsx`:
  - estado `responsaveisPostagemIds`;
  - UI condicional (dois blocos quando `categoria === "Posts"`);
  - persistência no `updateCard` do branch Posts;
  - lógica de "herdar responsáveis" estendida para o caso pai-Post.

**Não tocar**: `TaskFormBase.tsx`, `DemandaDetalheDialog.tsx`, `PostsKanbanCliente.tsx`, `AreaTab.tsx`, `ProjetoCliente.tsx`, edge functions, tipos do Supabase exceto regeneração automática.

---

## Resultado esperado

Dentro de qualquer Post, o bloco "Workflow / Continuidade" passa a permitir criar a próxima etapa (em qualquer categoria, incluindo outro Post) com dependência registrada em `task_dependencies`. Quando essa próxima etapa for um Post, o usuário define separadamente quem cria e quem publica. Posts antigos continuam abrindo normalmente, com o segundo campo apenas vazio.
