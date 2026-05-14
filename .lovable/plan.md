## Objetivo

Eliminar a tela intermediária de seleção em `/criar-tarefa` (com botão "Continuar") e mostrar diretamente o **mesmo formulário** do Projeto Completo (`DemandaDetalheDialog`), com os campos **Cliente** e **Área / Categoria** integrados dentro dele — um único formulário, sem etapa prévia.

## Mudanças

### 1. `src/components/demandas/DemandaDetalheDialog.tsx`
- No header do Card 1 (onde hoje há a linha de texto `{cliente} · {categoria}` abaixo do título), substituir por **dois Selects compactos**:
  - **Cliente** → `Select` populado com `useCRM().clientes`. `onValueChange` chama `updateDemanda(id, { cliente_id })`.
  - **Categoria** → mesmo Select já existente no grid abaixo, espelhado aqui (ou reutilizar variável). Mantém o Select de Categoria no grid logo abaixo intacto (ele continua funcional para edição também).
- Esses dois selects ficam sempre visíveis (substituindo o subtítulo readonly). Para tarefas existentes funcionam como edição normal; para rascunho recém-criado pelo módulo "Criar Tarefa" funcionam como definição inicial.

### 2. `src/pages/CriarTarefa.tsx`
- Remover a tela com Card "Criar nova tarefa" + botão "Continuar".
- Ao montar a página: criar **automaticamente** um rascunho mínimo via `createRascunho({ cliente_id: <primeiro cliente>, categoria: "Personalizado" })` apenas se houver clientes. **Alternativa preferida** (sem sujar dados): manter um mini-bloco minimalista de 2 selects centralizado **só** enquanto o rascunho não existe; assim que o usuário escolher Cliente + Área, criar o rascunho automaticamente (sem botão "Continuar") e renderizar o `DemandaDetalheDialog` em seguida.
- Ao fechar o dialog:
  - se rascunho ainda existe no store (foi preenchido) → navegar para `/clientes/{cliente_id}/projeto?tab=...&demanda={id}`;
  - se descartado → voltar a mostrar o mini-bloco de seleção para nova criação.

Adoto a alternativa preferida (sem placeholder) porque evita criar rascunhos órfãos no banco.

### 3. Resultado visual
- Sidebar → "Criar Tarefa" abre uma tela com **somente** o formulário completo da tarefa.
- Os campos Cliente e Área/Categoria aparecem como dropdowns dentro do header desse formulário, lado a lado com o título.
- Nenhuma duplicação: o mesmo `DemandaDetalheDialog` é usado em todo o sistema.

## Não alterado
- `TaskFormBase.tsx`, `PostDetalhe.tsx`, lógica de stores, schema, kanbans, abas Posts, comportamento dentro do Projeto Completo.
- Categoria continua editável também no grid abaixo (sem remover nada).

## Detalhes técnicos
- `DemandaDetalheDialog` ganha um Select Cliente novo no header; `cliente` deixa de ser apenas texto.
- `updateDemanda` já aceita `cliente_id` em `Partial<Demanda>` — sem mudança de store.
- `CriarTarefa.tsx` passa a usar 2 estados: `clienteId`, `categoria`, e dispara `createRascunho` no `useEffect` quando ambos preenchidos e ainda não há `draftDemanda`.
