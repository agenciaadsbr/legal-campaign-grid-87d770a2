## Problema

Ao clicar em um card de post na aba **Posts** dentro do **Projeto Completo** do cliente "Timidati Advogados", a aplicação cai em uma página 404.

## Causa raiz

O usuário está na rota `/clientes/:clienteId/projeto` (aba Posts). O componente `PostsKanbanCliente.tsx` (linha 248) usa um link **relativo**:

```tsx
<Link to={`posts/${post.id}`}>
```

Como a rota atual termina em `/projeto`, o React Router resolve isso para:
`/clientes/:clienteId/projeto/posts/:postId`

Mas em `src/App.tsx` (linha 57) a única rota cadastrada é:
`/clientes/:clienteId/posts/:postId`

Não existe variante com `/projeto/` no meio → cai no `<Route path="*" element={<NotFound />} />`.

O mesmo erro acontece na linha 405 do `PostsKanbanCliente.tsx` (clique em "Iniciar tarefa"), que monta a URL absoluta corretamente, mas o `<Link>` relativo do card é o caminho mais comum e o que aparece no print.

## Correção

Trocar o link relativo por um caminho **absoluto** já no `PostsKanbanCliente.tsx`, usando o `clienteId` que o componente já recebe via props:

**Arquivo:** `src/components/clientes/PostsKanbanCliente.tsx` (linha 248)

- Passar `clienteId` para o componente `CardPost` (ou usar o que já existe no escopo).
- Trocar:
  ```tsx
  <Link to={`posts/${post.id}`}>{inner}</Link>
  ```
  por:
  ```tsx
  <Link to={`/clientes/${clienteId}/posts/${post.id}`}>{inner}</Link>
  ```

Isso garante que o clique sempre vá para a rota registrada, independentemente de o usuário estar em `/clientes/:id` ou `/clientes/:id/projeto`.

## Fora de escopo

- Não vou adicionar uma rota duplicada `/clientes/:id/projeto/posts/:postId` — manteríamos duas URLs para a mesma tela, o que polui histórico/breadcrumbs.
- Não mexo em `PostDetalhe.tsx` nem no botão "Voltar" — eles já apontam corretamente.
