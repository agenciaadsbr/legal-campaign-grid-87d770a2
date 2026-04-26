
## Diagnóstico

Hoje a coluna **Responsáveis** nas duas tabelas novas (`ClientesGeralTable` e `ClientesDemandasTable`) renderiza apenas `AvatarStack`, que é puramente visual — não abre nenhum popover para atribuir/remover responsáveis. Já existe na base do projeto um componente pronto e funcional: `CelulaResponsaveis` em `src/pages/Clientes.tsx` (linhas 789–847), com popover, checkbox por responsável, atalho "+ atribuir" quando vazio, e que persiste via `updateCliente(clienteId, { responsaveis: next })`.

A correção é reaproveitar esse componente nas duas tabelas, sem mexer no comportamento existente do Kanban legado nem na lógica de filtros.

## Mudanças propostas

### 1. Extrair `CelulaResponsaveis` para um componente compartilhado
- Criar `src/components/clientes/CelulaResponsaveis.tsx` movendo o componente que hoje vive dentro de `src/pages/Clientes.tsx`.
- Em `src/pages/Clientes.tsx`, manter a função local apenas como re-export/import do novo arquivo (zero mudança de comportamento na visão "Status" Kanban legada).

### 2. `src/components/clientes/ClientesGeralTable.tsx` (módulo Clientes)
- Substituir o bloco que renderiza `<AvatarStack ... />` na coluna "Responsáveis" por `<CelulaResponsaveis clienteId={cliente.id} ids={cliente.responsaveis} />`.
- Adicionar `onClick={(e) => e.stopPropagation()}` na `<TableCell>` para evitar que a navegação para `/clientes/:id` dispare ao abrir o popover.
- Manter tamanho compacto (`size="xs"`) e o restante das colunas inalterado.

### 3. `src/components/demandas/ClientesDemandasTable.tsx` (módulo Demandas → Clientes)
- A linha agrega responsáveis vindos do **cliente** + dos **responsáveis das demandas daquele cliente**. Editar diretamente "responsáveis das demandas" na linha do cliente é ambíguo (uma linha = N demandas).
- Decisão: o popover edita os **responsáveis do CLIENTE** (mesma fonte de verdade do módulo Clientes). A pílula continuará mostrando a união (cliente + responsáveis das demandas), mas a edição altera apenas o cliente — comportamento idêntico ao módulo Clientes e consistente com o que o usuário pediu ("atribuir/remover responsáveis").
- Substituir `<AvatarStack ... />` por `<CelulaResponsaveis clienteId={l.cliente_id} ids={Array.from(l.responsaveisIds)} />` envolvido em `onClick={(e) => e.stopPropagation()}` na `<TableCell>` para não disparar a navegação `/demandas/cliente/:id` da `<TableRow>`.
- Como a `Set<string>` exibida hoje mistura cliente + demandas, vamos passar para o popover **apenas os ids do cliente** (`clientes.find(c => c.id === l.cliente_id)?.responsaveis ?? []`), garantindo que o estado dos checkboxes reflita corretamente o que está atribuído ao cliente. O `AvatarStack` agregado some — a pílula passa a mostrar exatamente os responsáveis do cliente (consistente com a tabela Clientes).

### 4. Sem alterações em
- `AvatarStack.tsx` (continua sendo usado em outros lugares como Kanban, dialogs, cards).
- Lógica de filtros, métricas, navegação ou qualquer outra coluna.
- Edição de responsável **dentro de uma demanda específica** — segue funcionando pelo `DemandaDetalheDialog` / Kanban como hoje.

## Resultado esperado
- Em **Clientes** (visão nova) e em **Demandas → Clientes**, clicar na célula "Responsáveis" abre um popover com checkboxes para marcar/desmarcar cada responsável, persistindo imediatamente no cliente.
- Quando vazia, a célula mostra "+ atribuir" em hover — igual à visão Kanban legada.
- Nenhuma regressão no Kanban de posts, no Kanban de demandas ou nos filtros existentes.
