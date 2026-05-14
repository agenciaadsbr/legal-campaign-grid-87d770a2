## Objetivo

Substituir o formulário atual de **Detalhes da Tarefa** da aba **Posts** (hoje renderizado por `PostDetalhe.tsx` usando `TaskFormBase`) pelo **mesmo layout/estrutura visual do formulário padrão validado** usado nas demais abas (`DemandaDetalheDialog`, mostrado no anexo), preservando a Legenda e todos os dados antigos dos posts.

Escopo restrito: apenas a tela de detalhe do post (rota `/clientes/:clienteId/posts/:postId` + abertura via card da aba Posts). Kanban, Projeto Completo, demais abas e store `useCRM`/banco **não são alterados**.

---

## Mudanças

### 1. Novo componente `src/components/clientes/PostDetalheDialog.tsx`
Réplica visual fiel de `DemandaDetalheDialog` (mesma estrutura de seções, mesmos componentes shadcn, mesmos espaçamentos, mesma `VoltarVisaoGeralButton`, mesmo card de cabeçalho com pílula de status, botão Urgente, ícones de copiar/abrir/excluir), porém vinculada a `Card` + `Post` da store `useCRM`.

Seções renderizadas, na mesma ordem do anexo:

1. **Voltar para Visão Geral** (já existe)
2. **Cabeçalho**: TÍTULO DA TAREFA (Input), botão Urgente, pílula de Status, ações (copiar link, abrir em nova aba, excluir)
3. **Categoria** (fixo "Posts", read-only) · **Subtipo** (campo livre opcional, só persiste se preenchido — usa `card.formato` se já existir, senão fica em branco) · **Prioridade** (Select)
4. **Data início** · **Data limite** (mapeados para `card.data_inicio_tarefa` / `card.data_limite_tarefa`)
5. **Responsáveis** (`AvatarStack` + popover, mapeado para `card.responsaveis`)
6. **Anexos** (lista + "Adicionar anexo", mapeado para `post.anexos`)
7. **Link do Meister** · **Link do Drive** (mapeados para `post.link_meister` e novo `post.link_drive` — campo já existe no payload via `updatePost`; se não existir na coluna do banco será gravado em `post.link_drive` se a coluna existir, caso contrário ignorado silenciosamente sem quebrar)
8. **Atividade / Briefing** (Textarea, mapeado para `card.descricao` ou campo `briefing` existente do post — usar o que já está em uso hoje)
9. **Campos de Post** (bloco extra, abaixo do Briefing, mantido por compatibilidade):
   - Data agendamento (`post.data_agendamento`)
   - Data postagem (`post.data_postagem`)
   - Link Meta Business Suite (`post.link_post`)
   - **Legenda** (`Textarea`, vinculado a `post.legenda`) — leitura e gravação preservando posts antigos
10. **ATIVIDADE / Comentários** (RichTextEditor + lista, usando `addAtividade` da `useCRM` que já existe para posts)
11. **Está com dúvidas na tarefa? Consulte aqui** (`TarefaIAConsulta` — adaptado para receber um objeto mínimo `{id, titulo, categoria:"Posts", cliente_id}` derivado do post; sem alterar o componente)
12. **Workflow / Continuidade** (`WorkflowSection` — alimentado a partir do `post.id` quando aplicável; se o componente exigir uma `Demanda`, exibimos um collapsible vazio "Sem etapas vinculadas" para não esconder a seção)

Persistência: todas as escritas continuam pelos métodos já existentes da `useCRM` (`updateCard`, `updatePost`, `addAtividade`). Nenhuma migração de dados, nenhuma remoção de coluna, nenhuma alteração de schema.

### 2. `src/pages/PostDetalhe.tsx`
- Remover uso de `TaskFormBase`.
- Renderizar o novo `PostDetalheDialog` no mesmo layout de página (envolvido por `Card` + `VoltarVisaoGeralButton`), passando `postId`.

### 3. Não tocar em
- `TaskFormBase.tsx` (continua sendo usado por Minhas Tarefas / Criar Tarefa para outras áreas).
- `PostsKanbanCliente.tsx` (continua navegando para `/clientes/:cid/posts/:postId`).
- `DemandaDetalheDialog.tsx`, `AreaTab.tsx`, `ProjetoCliente.tsx`, store `useCRM`, store `useDemandas`, edge functions, banco.
- Posts antigos: campo `legenda` lido e gravado normalmente; nada é apagado, migrado ou limpo.

---

## Detalhes técnicos

- O novo `PostDetalheDialog` é um componente de página (não usa `<Dialog>`), espelhando o layout interno do `DialogContent` de `DemandaDetalheDialog` para manter idêntico ao anexo.
- Reaproveitar tokens semânticos do `index.css` (sem cores hardcoded).
- `TarefaIAConsulta` recebe um `Demanda`-like mínimo via cast (`as any`) para evitar mudança no contrato do componente; comentários são lidos/gravados em `atividades` da `useCRM`, que é a fonte real para posts.
- `WorkflowSection` é incluído mesmo quando não há etapas, para cumprir "NÃO esconder componentes".

---

## Resultado esperado

- Aba Posts → ao abrir um card, aparece o **mesmo formulário visual** do anexo (campos, ordem, estilo).
- **Legenda** preservada (leitura e gravação).
- Posts antigos abrem normalmente, sem perda de dados.
- Demais abas, kanbans, Projeto Completo e store inalterados.