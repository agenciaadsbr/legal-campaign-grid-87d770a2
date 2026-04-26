## Problema
O campo "Buscar cliente..." no sub-tab **Clientes** duplica a função do "Buscar por título..." global no header de filtros.

## Plano

### `src/components/demandas/ClientesDemandasTable.tsx`
- Remover o `Input` de "Buscar cliente..." e o `Card` que o envolve.
- Remover o estado local `busca` e o `useState` correspondente.
- Adicionar nova prop opcional `filtroBusca?: string` para receber o termo global.
- Atualizar o `useMemo` para filtrar clientes pelo `filtroBusca` (match no `nome`), mantendo o comportamento atual de busca.
- Remover import não usado `Input` se não houver mais uso.

### `src/pages/Demandas.tsx`
- Passar `filtroBusca={busca}` para `<ClientesDemandasTable />` na aba Clientes, para que o input global "Buscar por título..." também filtre a lista de clientes por nome.

## Resultado
- Apenas uma barra de busca visível (a global no topo).
- O termo digitado filtra demandas (por título) e também clientes (por nome) no sub-tab Clientes.