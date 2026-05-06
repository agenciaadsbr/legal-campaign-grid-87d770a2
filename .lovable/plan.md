## Problema

Cliente "Timidati advogados": após "Iniciar tarefa" os 12 cards vão para a coluna **Criar**, mas clicar em qualquer card não abre o detalhe do post.

Conferi o banco — todos os 12 cards têm `post_id` correspondente em `posts`, então não é dado faltando. O problema é de comportamento de UI.

## Causa raiz em `src/components/clientes/PostsKanbanCliente.tsx`

O `CardItem` envolve o `<div>` draggable do dnd-kit dentro de um `<Link>` (linha 185):

```tsx
return <Link to={`posts/${post.id}`}>{inner}</Link>;
```

Esse padrão tem dois problemas conhecidos com `@dnd-kit/core`:

1. **Native HTML drag dos `<a>`**: tags `<a>` têm `draggable=true` por padrão. O `PointerSensor` do dnd-kit faz `preventDefault()` no `pointerdown` para suprimir esse drag nativo, e isso **cancela o `click` subsequente** do navegador. Resultado: clicar no card "não faz nada".
2. **Concorrência drag/click**: mesmo com `activationConstraint: { distance: 5 }`, em alguns navegadores o `preventDefault` do pointerdown impede o click. Era intermitente; piorou agora que cards têm `useDraggable` ativo (status "Criar").

Fora do modo seleção isso afeta TODOS os cards. Em "Planejamento" o card era clicado mas o `Link` apontava para um post que existia → funcionava por sorte (sem listeners ativos em alguns ciclos). Após "Iniciar tarefa" os cards passam para "Criar" e ficam plenamente draggable, expondo o bug.

## Solução

Remover o `<Link>` e navegar programaticamente via `onClick` no `<div>` interno, com `useNavigate`. O dnd-kit já distingue corretamente click (sem mover) de drag (mover ≥5px) via `activationConstraint`, e o click handler só executa se o drag não tiver iniciado.

### `src/components/clientes/PostsKanbanCliente.tsx` — `CardItem`

1. **Aceitar `clienteId` como prop** (passado pelo pai que já tem `useParams`), para montar a URL de destino.
2. **Adicionar `useNavigate`** dentro do componente.
3. **No `<div>` interno (linha 100)** adicionar:
   ```tsx
   onClick={(e) => {
     if (selectionMode) {
       e.preventDefault();
       e.stopPropagation();
       onToggleSelect?.();
       return;
     }
     if (!post || !clienteId) return;
     navigate(`/clientes/${clienteId}/posts/${post.id}`);
   }}
   draggable={false}
   ```
4. **Remover** as linhas 184-185:
   ```tsx
   if (!post) return inner;
   return <Link to={`posts/${post.id}`}>{inner}</Link>;
   ```
   E retornar `inner` direto:
   ```tsx
   return inner;
   ```
5. **Remover o wrapper de checkbox** que tinha `onClick`/`onPointerDown` parando propagação (linhas 112-124) — manter apenas o `<Checkbox>` visual no canto, já que o clique no card todo trata seleção em modo seleção. Manter `onPointerDown` stop só para não iniciar drag a partir do checkbox visualmente.
6. **Garantir `cursor-pointer`** no card também em modo seleção (e fora), mantendo `cursor-grab` apenas como estado de drag.
7. No componente pai (`Coluna` e onde `CardItem` é renderizado nas linhas 242-251 e 612), passar `clienteId={clienteId}` para `CardItem`.

### Resultado esperado

- Clicar em qualquer card (em qualquer coluna, dentro ou fora do modo seleção) abre o detalhe do post.
- Em modo seleção, o clique alterna seleção em vez de abrir.
- Drag-and-drop continua funcionando fora do modo seleção (movimento ≥5px → drag; clique sem mover → navega).
- Comportamento idêntico para os 12 cards do Timidati advogados após o "Iniciar tarefa".

## Não vai mexer

- `src/store/crm.ts`, `PostDetalhe`, `MinhasTarefas`.
- `iniciarSelecionados`, `podeIniciarSelecionados`, atribuição em lote.
- Drag-and-drop, paginação, urgência, prazo, badges.
- Demais componentes/módulos.
