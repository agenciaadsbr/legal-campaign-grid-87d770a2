## Objetivo

Permitir que o usuário defina/edite o **título da tarefa** clicando direto no texto **"Definir título da tarefa"** (ou no título atual) no card externo do Kanban — sem precisar abrir o modal "Iniciar tarefa" nem entrar no card interno.

## Comportamento proposto

No componente `CardItem` em `src/pages/ClienteDetalhe.tsx` (linhas 84-96):

1. **Estado de edição local** no `CardItem`:
   - `editing: boolean`
   - `valor: string` (inicializado com o título real, vazio se for placeholder)

2. **Disparo da edição (apenas quem tem `canWrite`)**:
   - Clique no texto do título entra em modo edição.
   - Em **Planejamento com placeholder**: clique simples já abre o input (o texto cinza italic "Definir título da tarefa" funciona como CTA visual).
   - Nos demais status: duplo clique para evitar conflito com o `<Link>` que navega para o post (impede o navegador de abrir o detalhe ao tentar editar).
   - `onPointerDown` com `stopPropagation` para não disparar o drag do dnd-kit.

3. **Input inline**:
   - `<Input>` compacto (`h-7 text-sm`) substitui o `<span>` no mesmo lugar.
   - `autoFocus`, `placeholder="Título da tarefa"`.
   - **Salvar**: `Enter` ou `blur` → `updateCard(card.id, { titulo: valor.trim() })` (apenas se mudou e não está vazio); toast "Título atualizado".
   - **Cancelar**: `Escape` → descarta e volta ao texto.
   - Vazio + Enter/blur: não salva, sai do modo edição mantendo o valor anterior.

4. **Compatibilidade**:
   - O `iniciarTarefa` no modal continua funcionando — se o usuário já tiver definido o título inline, o modal abre pré-preenchido (já é o comportamento atual via `useEffect` no `IniciarTarefaDialog`).
   - Não muda nada no banco, store ou no `PostDetalhe`.

## Arquivos a alterar

- **`src/pages/ClienteDetalhe.tsx`** — substituir o bloco `<span title={...}>{tituloVisivel}</span>` (linhas 87-95) por componente que alterna entre texto e input. Adicionar imports de `useState`/`useRef` (já tem `useState`) e usar o `Input` já importado.

Nenhuma migration, nenhum outro arquivo afetado.
