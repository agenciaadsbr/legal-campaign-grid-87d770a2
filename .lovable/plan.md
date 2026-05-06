## Problema

Após usar **"Selecionar cards" → "Iniciar tarefa"**, os cards (que agora estão na coluna **Criar**) não abrem mais o detalhe ao clicar. A edição individual deixa de funcionar.

### Causa raiz em `src/components/clientes/PostsKanbanCliente.tsx`

No componente `CardItem` (linha 192):

```tsx
if (!post || selectionMode) return inner;
return <Link to={`posts/${post.id}`}>{inner}</Link>;
```

O card SÓ é envolvido por `<Link>` se `selectionMode === false` **e** o `post` correspondente já existir no estado local. Dois problemas:

1. **Durante o modo seleção** (e durante toda a execução de `iniciarSelecionados`, que é `async`), o card NUNCA tem Link — clicar só alterna seleção. Se o usuário clicar logo após mandar iniciar, nada abre.
2. **Logo após `iniciarSelecionados`**, `_loadAll()` é chamado para refazer o estado a partir do banco. Durante o re-render, há janelas em que o card foi atualizado (status="Criar") antes do array `posts` ter sido refrescado, então `post` pode resolver para `undefined` em alguns ciclos e cair no ramo `return inner` (sem Link). Combinado com o handler `onClick` da linha 103-111 que faz `preventDefault` no modo seleção, fica preso.

Além disso, mesmo já fora do modo seleção, o handler de clique do `<div>` interno (linhas 103-111) ainda está condicional, mas o ramo `selectionMode` continua sendo o último estado vinculado se o componente não rerenderizar com `selectionMode=false` antes do clique.

## Solução

Tornar o card **sempre clicável para abrir detalhes** (independente do modo seleção) e usar o **checkbox** como única superfície de seleção em lote.

### `src/components/clientes/PostsKanbanCliente.tsx` — `CardItem`

1. **Linha 192**: trocar `if (!post || selectionMode) return inner;` por:
   ```tsx
   if (!post) return inner;
   ```
   O card vira Link sempre que existir post associado, inclusive em modo seleção.

2. **Linhas 103-111** (`onClick` do `<div>`): remover o handler `onClick` por completo. O clique no corpo passa a propagar normalmente para o `<Link>` pai e abre os detalhes.

3. **Linhas 122-132** (wrapper do `<Checkbox>`): aumentar a área de toque e garantir que o clique no checkbox NÃO navegue:
   ```tsx
   <div
     className="absolute top-1.5 right-1.5 z-10 p-1"
     onPointerDown={(e) => e.stopPropagation()}
     onClick={(e) => {
       e.preventDefault();
       e.stopPropagation();
       onToggleSelect?.();
     }}
   >
     <Checkbox checked={!!selected} className="bg-background" />
   </div>
   ```

4. **Linha 97** (`dragProps`): manter como está — drag-and-drop continua desativado em modo seleção.

5. Remover a classe `cursor-pointer` aplicada ao card inteiro em modo seleção (linha 115). Manter `cursor-grab` quando fora do modo seleção; em modo seleção o card vira link normal.

### Resultado

- Em modo seleção:
  - Clicar no **checkbox** (ou na área aumentada ao redor) → marca/desmarca.
  - Clicar em **qualquer outro lugar** do card → abre detalhe individual.
  - Botão "Iniciar tarefa (N)" continua iniciando os marcados em lote.
- Após "Iniciar tarefa": cards na coluna Criar (e em qualquer outra coluna) abrem detalhes normalmente ao clique.
- Fora do modo seleção: comportamento atual preservado (drag-and-drop + clique abre detalhes).

## Não vai mexer

- `iniciarSelecionados`, `podeIniciarSelecionados`, atribuição em lote de responsáveis, "Selecionar todos", "Limpar", "Sair".
- `src/store/crm.ts`, `PostDetalhe`, `MinhasTarefas`, demais módulos.
- Drag-and-drop fora do modo seleção, urgência, prazo, paginação.
