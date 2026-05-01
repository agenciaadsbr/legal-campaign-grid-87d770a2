## Objetivo

Limpar a barra superior da página `/clientes` removendo três controles obsoletos, sem alterar a tabela, suas colunas ou os dados do banco.

## Mudanças (apenas em `src/pages/Clientes.tsx`)

### 1. Remover a aba "Clientes / Status" (ToggleGroup de visão)
- Remover o `ToggleGroup` (linhas ~1642–1650) que alterna entre `clientes` e `status`.
- Remover o estado `visao` e seu `useEffect` de persistência (`localStorage "clientes:visao"`).
- Remover o bloco condicional `visao === "status"` que renderiza os switches "Apenas com ações pendentes" e "Mostrar concluídos" no topo.
- Remover o ramo `else` do return (a tabela alternativa de "status") — manter apenas a renderização do `ClientesGeralTable`.
- Limpar imports/estados que ficarem órfãos após remover a visão Status (ex.: `apenasPendentes`, `mostrarConcluidos`, `gruposPosts`, etc.) somente se realmente não forem mais usados.
- Ajustar o subtítulo: trocar a condição `visao === "clientes" && algumFiltroAtivo` por apenas `algumFiltroAtivo`.

A coluna "Status" da tabela e os dados de `status_cliente` no banco permanecem intactos.

### 2. Remover o botão "Minhas tarefas"
- No componente `FiltrosTopo` (linhas ~1403–1422), remover o `<Button>` "Minhas tarefas".
- Remover o estado `apenasMinhas` e o setter da página.
- Remover `apenasMinhas` da prop passada ao `ClientesGeralTable` (manter a prop como `false` se a assinatura exigir; idealmente remover do uso).
- Remover `apenasMinhas` da composição `algumFiltroAtivo` e da função `limparFiltros`.
- O filtro "Filtrar por responsável" (popover de responsáveis) permanece intacto.

### 3. Remover o seletor "Compacto / Confortável"
- Remover o `ToggleGroup` de densidade (linhas ~1772–1792).
- Remover o estado `density` e o `useEffect` que persiste em `localStorage "dashtasks.clientes.density"`.
- Não passar mais a prop `density` ao `ClientesGeralTable` — o componente já tem default `"compacto"`, então o layout permanece o atual padrão.

## Resultado da barra de filtros

Linha principal:
- Todos os status (Select existente)
- Filtrar por responsável (Popover existente)
- Nicho
- Período
- Contrato: todos
- Buscar cliente

Linha secundária / ações:
- Configurações do painel (`ConfiguracoesSheet`)
- Colunas (`GerenciarColunas`)
- Novo Cliente (`NovoClienteDialog`)

## Não alterar
- `src/components/clientes/ClientesGeralTable.tsx` (a não ser, opcionalmente, remover a prop `density` da chamada — o componente continua aceitando default).
- Colunas Status, Último comentário, Nicho, Período do contrato, Posts atrasados, Tarefas atrasadas, Tarefas urgentes, Onboarding.
- Botões editar/excluir, lógica de responsáveis, filtro de período, busca, schemas e dados do Supabase.

## Versão
- Bump em `public/version.json`.

## Validação
- A barra superior não exibe mais o toggle "Clientes/Status", o botão "Minhas tarefas" nem os botões "Compacto/Confortável".
- Filtros de responsável, nicho, período, contrato, status e busca continuam funcionando.
- A tabela renderiza no layout padrão (compacto) sem erros de console.
