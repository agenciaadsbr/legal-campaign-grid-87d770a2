## Contexto

Na aba **Posts** do Projeto do Cliente ainda existem dois formulários separados, exatamente o problema que já corrigimos para Demandas:

1. **`IniciarTarefaDialog`** (`src/components/IniciarTarefaDialog.tsx`) — abre quando o usuário arrasta um card da coluna "Planejamento" para outra coluna. Pede título, briefing, responsáveis, prazo, formato e slides em um modal antes de "iniciar a tarefa".
2. **`NovaTarefaSeletor`** (mini-dialog em `ProjetoCliente.tsx`, screenshot enviada) — abre pelo botão "Adicionar Tarefa" do Kanban de Posts. Pede só "Categoria" e cria uma **demanda** (não um post), o que é incoerente dentro da aba Posts.

Posts são uma entidade própria (tabela `cards` + `posts`) com fluxo Planejamento → colunas de produção. O detalhe completo de um post já existe em `src/pages/PostDetalhe.tsx` (rota `/clientes/:id/posts/:postId`) — esse é o "card único" equivalente ao `DemandaDetalheDialog`.

## Objetivo

Aplicar à aba Posts a mesma filosofia da unificação de Demandas: **um único formulário em todo o ciclo** (criar e editar). Sem mini-modal de pré-cadastro, sem dialog separado de "Iniciar tarefa".

## Alterações

### 1. `src/components/clientes/PostsKanbanCliente.tsx`

- **Botão "Adicionar Tarefa"**: trocar a callback `onAdicionarTarefa` por uma ação local que cria um card rascunho diretamente em `cards` (status "Planejamento", título "Sem título", `mes_referencia` = mês corrente do filtro ou 1, `numero_semana` derivado do próximo slot livre) e navega para `/clientes/:clienteId/posts/:postId` do post recém-criado. A criação usa um novo helper `createCardRascunho` no store.
- **Drag-and-drop a partir de "Planejamento"**: remover a chamada `abrirIniciar(card.id)`. Em vez de abrir `IniciarTarefaDialog`, mover o card normalmente via `moveCard` para a nova coluna, **e em seguida navegar para `/clientes/:id/posts/:postId`** (o detalhe), de modo que o usuário ajuste título/responsáveis/formato/prazo no mesmo lugar onde editaria depois. Se o título ainda for o placeholder "Post Mês X - Semana Y", aplicar foco automático no campo de título do detalhe (via query param `?focus=titulo`).
- **Clique no card já existente**: continua navegando para o detalhe (comportamento atual).
- Remover import e uso de `IniciarTarefaDialog`, estados `iniciarOpen`/`iniciarCardId` e função `abrirIniciar`.

### 2. `src/store/crm.ts`

- Adicionar `createCardRascunho({ cliente_id, mes_referencia? })`: insere um card em `cards` com `status_card: "Planejamento"`, título placeholder, sem responsáveis/prazo, e cria também o registro em `posts` vinculado (mesmo padrão usado hoje quando um card é "iniciado"), retornando `{ cardId, postId }`. A criação simultânea garante que o `PostDetalhe` consiga abrir imediatamente.
- Manter `iniciarTarefa` no store para uso interno (chamado pelo próprio `PostDetalhe` quando o usuário move o status), mas o dialog separado deixa de existir.

### 3. `src/pages/PostDetalhe.tsx`

- Aceitar query param `?focus=titulo` e dar `autoFocus` no input de título quando presente.
- Garantir que o detalhe exponha visivelmente: **Status**, **Formato do post**, **Quantidade de slides** (quando Carrossel), **Prazo**, **Responsáveis**, **Briefing/atividade** — esses campos já existem na página, apenas confirmar que estão acessíveis sem precisar de outro modal. Se algum estiver faltando (formato/slides), adicionar inline na seção de metadados do post, no mesmo padrão visual já usado.
- Botão de voltar continua para a aba Posts (`?tab=posts`).

### 4. `src/pages/ProjetoCliente.tsx`

- Remover do `<TabsContent value="posts">` o prop `onAdicionarTarefa` (a criação agora é interna ao Kanban).
- Manter `NovaTarefaSeletor` apenas para as outras abas que criam **demandas** (vídeos, tráfego, LP, IA, urgências) — nada muda fora de Posts.

### 5. Remoção

- **Excluir** `src/components/IniciarTarefaDialog.tsx`. Buscar referências remanescentes e removê-las (já confirmamos que só `PostsKanbanCliente.tsx` importa).

### 6. `public/version.json`

- Atualizar timestamp para invalidar cache.

## Comportamento final

```text
Aba Posts → botão "Adicionar Tarefa"
  └─ cria card rascunho em "Planejamento"
     └─ abre /clientes/:id/posts/:postId (PostDetalhe) com foco no título

Aba Posts → arrastar card de "Planejamento" para "Em produção" (ou outra)
  └─ moveCard atualiza status
     └─ abre /clientes/:id/posts/:postId (PostDetalhe) com foco no título
        (somente se o título ainda for placeholder)

Aba Posts → clicar em card existente
  └─ abre /clientes/:id/posts/:postId (PostDetalhe)  [já era assim]
```

Em todos os caminhos o usuário enxerga **o mesmo formulário** (`PostDetalhe`), ajustando todos os campos no próprio card — nenhum modal intermediário.

## Riscos

- Cards rascunho com título "Sem título" podem ficar órfãos se o usuário fechar a aba; mitigação: manter o placeholder `Post Mês X - Semana Y` (já existente) como título inicial em vez de "Sem título", então não há ruído visual no Kanban.
- O fluxo de drag-and-drop deixa de ter "confirmação antes de iniciar". Como o `PostDetalhe` abre logo em seguida, o usuário continua tendo a chance de ajustar tudo, e pode arrastar o card de volta para "Planejamento" se foi engano.
