## Remover tela legada `ProjetoDemandasCliente`

A tela `/demandas/cliente/:clienteId` é resquício do antigo item "Demandas" da sidebar. O fluxo oficial agora vive em `/clientes/:clienteId` (aba Demandas dentro do Projeto Completo). Vamos eliminar o código morto e redirecionar links antigos para o novo destino.

### Mudanças

**1. `src/App.tsx`**
- Remover `import ProjetoDemandasCliente from "./pages/ProjetoDemandasCliente"`.
- Remover a rota `<Route path="/demandas/cliente/:clienteId" .../>`.

**2. `src/pages/ProjetoDemandasCliente.tsx`**
- Deletar o arquivo.

**3. `src/components/demandas/ClientesDemandasTable.tsx`** (2 ocorrências, linhas 343 e 473)
- Trocar `navigate(\`/demandas/cliente/${l.cliente_id}\`)` por `navigate(\`/clientes/${l.cliente_id}\`)`, para que cliques na tabela de demandas por cliente abram o Projeto Completo já com as abas (incluindo Demandas) disponíveis.

### Resultado
- Um arquivo a menos (≈130 linhas de código morto removidas).
- Rota legada eliminada — sem links órfãos.
- Tabela de demandas por cliente passa a navegar para a tela canônica do cliente.
- Nenhum impacto em dados, store ou lógica de demandas (tudo continua em `useDemandas`).