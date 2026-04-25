
## Objetivo

Permitir que o usuário **edite, salve, atualize e remova clientes** diretamente da aba `/clientes`, reaproveitando as funções `updateCliente` e `deleteCliente` que já existem no `src/store/crm.ts` (linhas 548 e 570). Nenhuma mudança no banco é necessária — toda a infraestrutura (tabelas, RLS, função no store) já existe.

## O que está pronto hoje

- `addCliente` → usado pelo botão **Novo Cliente** ✅
- `updateCliente(id, patch)` → existe no store, mas **não é exposto na UI** ❌
- `deleteCliente(id)` → existe no store, mas **não é exposto na UI** ❌
- RLS: admin pode deletar; admin/editor podem atualizar (já configurado)

## Mudanças propostas

### 1. Nova coluna fixa "Ações" na tabela de clientes (`src/pages/Clientes.tsx`)

Adicionar uma coluna fixa à direita em cada linha de cliente (linhas 974–1001) com dois botões ícone:
- ✏️ **Editar** → abre `EditarClienteDialog`
- 🗑️ **Excluir** → abre `AlertDialog` de confirmação e chama `deleteCliente`

A coluna não fará parte do `colunasVisiveis` configurável — ficará sempre visível como última célula, similar ao botão de ações em listas comuns.

### 2. Componente `EditarClienteDialog`

Criado dentro de `src/pages/Clientes.tsx` (mesmo padrão do `NovoClienteDialog` já existente nas linhas 100–214). Será praticamente um clone com:
- Pré-preenchimento dos campos a partir do `cliente` recebido por prop (nome, nicho, status, responsáveis, observações, datas do contrato)
- Botão **Salvar Alterações** chamando `updateCliente(cliente.id, patch)`
- Reuso do `ResponsaveisPicker` já existente
- Reuso da lógica de `data_inicio` + `duracao_meses` → `data_fim`

### 3. Confirmação de exclusão

Usar `AlertDialog` (`src/components/ui/alert-dialog.tsx`) com mensagem clara:
> "Excluir o cliente **{nome}**? Todos os cards, posts, contratos e alertas vinculados serão removidos. Esta ação não pode ser desfeita."

Ao confirmar:
- `deleteCliente(cliente.id)` (já remove cascata: contratos, alertas, posts, cards, cliente)
- `toast.success("Cliente excluído")`

### 4. Permissões

- Botão **Editar** visível para qualquer usuário autenticado (RLS bloqueia se não tiver permissão e mostramos toast de erro)
- Botão **Excluir** visível somente para `admin` (verificado via `useAuth` + `has_role`). Para usuários não-admin o botão fica oculto.

## Arquivos a modificar

- `src/pages/Clientes.tsx` — adicionar `EditarClienteDialog`, coluna "Ações" na tabela e wiring de delete com AlertDialog

## Não será alterado

- Banco de dados (schema, RLS, funções) — tudo já preparado
- `src/store/crm.ts` — `updateCliente` e `deleteCliente` já fazem o trabalho
- Layout/identidade visual — apenas adição de uma coluna de ações no padrão atual
