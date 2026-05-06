## Problema

Na aba **Posts**, ao clicar em qualquer card (tanto os antigos `Post Mês X - Semana Y` quanto os novos `Criar Post`), os detalhes do post **não abrem mais**. O card está envolto por um `<Link>`, mas o título interno (`<span>` na linha 173-186 de `PostsKanbanCliente.tsx`) tem um `onClick={startEdit}` que chama `e.stopPropagation()` + `e.preventDefault()`, **bloqueando a navegação do Link**.

Esse comportamento foi introduzido para permitir editar o título inline clicando nele — mas como o handler está ativo em todo clique simples (sempre que `canWrite && !selectionMode`), ele captura toda interação do usuário e impede a abertura dos detalhes.

## Solução

Remover a edição inline do título por **clique simples**. Manter apenas:

- **Clique simples no card** → abre detalhes do post (comportamento original/esperado).
- **Edição do título** → feita dentro da página de detalhes do post (já existe lá), conforme a regra que o usuário definiu anteriormente: "caso o usuário queira editar ele faz dentro dos detalhes da tarefa".

## Mudanças

### `src/components/clientes/PostsKanbanCliente.tsx` — componente `CardItem`

1. **Remover handlers de edição inline no `<span>` do título** (linhas ~173-186):
   - Remover `onPointerDown` que faz `stopPropagation`.
   - Remover `onClick={startEdit}`.
   - Remover `onDoubleClick={startEdit}`.
   - Remover classes `cursor-text hover:text-primary` (volta a parecer texto normal dentro de um link clicável).
   - Ajustar o `title` do span para apenas mostrar o título completo no hover.

2. **Remover estado e funções não mais usados** no `CardItem`:
   - `editingTitulo`, `setEditingTitulo`, `tituloDraft`, `setTituloDraft`.
   - Função `startEdit` e `commitTitulo`.
   - Bloco `editingTitulo ? <Input .../> : <span .../>` — manter apenas o `<span>`.
   - `isPlaceholderTitulo` (não mais necessário).

3. **Manter inalterado**:
   - O wrapper `<Link to={`posts/${post.id}`}>` na linha 234-235.
   - Drag-and-drop (`useDraggable` + `dragProps`).
   - Modo seleção (`selectionMode` + checkbox + toggle).
   - Botão de urgência (`toggleUrgent`).
   - StatusBadge, AvatarStack, prazo, formato, etc.

## Não vai mexer

- `src/store/crm.ts` — sem alterações.
- `src/lib/minhasTarefas.ts` — sem alterações.
- Outros módulos (Demandas, Briefing, Documentação, Planejamento, Dashboard, Relatórios) — intactos.
- A página `PostDetalhe` continua permitindo editar o título do post normalmente.

## Resultado esperado

- Clicar em qualquer card de Post (em qualquer coluna: Planejamento, Criar, Revisar, Agendado) abre a página de detalhes do post.
- O fluxo de "Selecionar cards" + "Iniciar tarefa" continua funcionando exatamente como está.
- Edição de título só pode ser feita dentro dos detalhes do post.
