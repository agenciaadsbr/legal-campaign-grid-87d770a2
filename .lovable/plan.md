## Renomear item do menu lateral

Alteração mínima, 1 arquivo, 1 linha.

### Arquivo
`src/components/AppSidebar.tsx` (linha 20)

- De: `{ title: "Clientes/Posts", url: "/clientes", icon: Users },`
- Para: `{ title: "Clientes", url: "/clientes", icon: Users },`

### O que NÃO muda
- Rota `/clientes` permanece igual — nenhum link interno quebra.
- Página `Clientes.tsx` e abas internas do cliente (Posts, Visão Geral, Urgências, etc.) intactas.
- Tooltip do menu colapsado passa a mostrar "Clientes" automaticamente.
