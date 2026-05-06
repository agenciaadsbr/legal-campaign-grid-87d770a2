## Diagnóstico do estado atual

- Ao **criar um cliente** (`addCliente` em `src/store/crm.ts`, linhas ~556–584), o sistema **já gera automaticamente `meses × 4` cards** + posts no Supabase, com título `Post Mês X - Semana Y` e status `Planejamento`.
- No **Kanban da aba Posts** (`PostsKanbanCliente.tsx`), cada card aparece como uma "tarefa" individual com botão **"Iniciar tarefa"** próprio (linhas 227-237). Já existe **modo de seleção em massa** (botão "Selecionar", linhas 514-527, 536-599) que hoje só atribui responsáveis.
- No módulo **"Minhas Tarefas"** (`src/lib/minhasTarefas.ts`, linhas 185-279), os cards de posts **já são agrupados** em **1 tarefa única** por (cliente + responsável + contrato), com título tipo "Criar 12 posts". Ou seja, o conceito que o usuário descreve já existe parcialmente — falta apenas formalizar visualmente no Kanban e trocar o "Iniciar tarefa" individual por um **único botão em massa**.

Conclusão: **não precisa de nova tabela**. Os cards já são "filhos" naturais do contrato. Basta:
1. Manter a geração automática (já está correta para Semestral=6m=24 cards, Trimestral=3m=12 cards, etc.).
2. Substituir o botão "Iniciar tarefa" de cada card por **um botão único** ("Iniciar tarefa") que age sobre os cards selecionados.
3. Adicionar um **cabeçalho "Tarefa de Posts"** no topo do Kanban mostrando "1 tarefa · N posts (X em planejamento, Y em andamento, Z concluídos)" para reforçar visualmente o conceito.
4. Garantir que cards continuem **independentes** (drag & drop, status individual, prazos individuais — já é assim hoje).

## Mudanças

### 1. `src/components/clientes/PostsKanbanCliente.tsx`

**a) Remover o botão "Iniciar tarefa" individual de cada `CardItem`**
- Linhas 227-242: substituir o bloco condicional `{isPlanejamento && canWrite && !selectionMode ? <Button…/> : <StatusBadge…/>}` por **apenas** o `StatusBadge` (sempre).
- Remover prop `onIniciar` do `CardItem` e do `Coluna` (limpeza). O `DragOverlay` (linha 627) também perde esse prop.

**b) Cabeçalho "Tarefa de Posts" no topo do Kanban**
- Logo acima da barra de filtros (antes da `<div className="flex items-center gap-2 flex-wrap">` da linha 440), inserir um card resumo:
  ```
  ┌──────────────────────────────────────────────────────┐
  │ Tarefa de Posts · {N} posts no contrato              │
  │ Planejamento: X · Em andamento: Y · Concluídos: Z    │
  └──────────────────────────────────────────────────────┘
  ```
- Usa `cardsCliente` para contar; sem novas queries.
- Texto curto e usando tokens semânticos (`bg-card`, `text-muted-foreground`).

**c) Botão único "Iniciar tarefa" no modo de seleção**
- No bloco do `selectionMode` (linhas 536-599), adicionar **antes** do `AtribuirResponsaveisPopover` um novo botão `<Button>Iniciar tarefa ({selectedIds.size})</Button>`.
- Habilitado apenas quando `selectedIds.size > 0` **e** ao menos um dos selecionados está em status `Planejamento`.
- Ao clicar: para cada card selecionado em `Planejamento`, chamar `updateCard(id, { status_card: "Criar" })` em paralelo (`Promise.all`). Cards já fora de "Planejamento" são ignorados (não regridem).
- Toast: `"X tarefa(s) iniciada(s)"`.
- Ao fim, limpar seleção e sair do `selectionMode`.

**d) Tornar o modo de seleção mais visível para esse fluxo**
- Renomear o botão `"Selecionar"` (linha 525) para `"Selecionar cards"` para deixar claro o propósito (iniciar/atribuir em massa).

### 2. `src/store/crm.ts` — `addCliente` (linhas 556-584)

- Manter a geração automática de `meses × 4` cards (já cobre Mensal=4, Trimestral=12, Semestral=24, Anual=48).
- **Trocar o título** dos cards inseridos de `` `Post Mês ${m} - Semana ${s}` `` para **`"Criar Post"`** (alinhado com a regra atual de `createCardRascunho` aplicada na conversa anterior). A informação "Mês X · Semana Y" continua exibida no rodapé do card via `card.mes_referencia` / `card.numero_semana` (cálculo derivado de `posicao`, já existente em `mapCard`).
- Sem mudança no schema.

### 3. `src/lib/minhasTarefas.ts` — sem mudanças

O agrupamento já produz **1 tarefa única** por (cliente + responsável + contrato) com título `"Criar N posts"`. Já está correto. Apenas confirmar visualmente que continua funcionando depois das mudanças no Kanban (não há impacto direto, pois esse arquivo lê `cards` direto).

### 4. Outros módulos — **nenhuma mudança**

- `Demandas`, `Planejamento`, `Documentação`, `Briefing`, `Dashboard`, `Relatórios`: **intocados**.
- RLS, schema, edge functions: **intocados**.
- Botões "Iniciar" de demandas / outras abas: **intocados**.

## Detalhes técnicos

- O status `"Planejamento"` é o gatilho do botão. Ao iniciar, o card vai para `"Criar"` (igual ao comportamento atual de `iniciarTarefa` mínimo, sem exigir prazo/responsável — usuário pode preencher depois clicando no card).
- Cards travados em qualquer coluna (Revisar, Atrasado, etc.) **continuam parados** sem afetar os demais — comportamento já garantido por `status` ser por card.
- Contagem "1 tarefa de N posts" em "Minhas Tarefas" já funciona via agrupamento existente.
- Clientes **antigos** com cards titulados `Post Mês X - Semana Y` continuam funcionando; o título antigo permanece no banco (não há migração de dados nesta entrega para não alterar histórico). Apenas novos clientes terão "Criar Post".

## Resumo

| Aspecto | Antes | Depois |
|---|---|---|
| Criação do cliente | Gera N cards (já fazia) com títulos "Post Mês X - Semana Y" | Gera N cards com título "Criar Post" |
| Botão "Iniciar tarefa" | 1 por card em Planejamento | 1 único no modo de seleção, age em vários |
| Cards independentes | Sim | Sim (sem mudanças) |
| Contagem em "Minhas Tarefas" | Já mostra "Criar N posts" como 1 tarefa | Continua igual |
| Outros módulos | — | Sem alterações |
