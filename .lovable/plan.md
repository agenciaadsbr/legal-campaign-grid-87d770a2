## Renomear "Clientes/Posts" → "Clientes" nos textos restantes

A renomeação anterior cobriu apenas o item da sidebar. Faltam três locais visíveis ao usuário (breadcrumb do header, título da página e breadcrumb da página de demandas do cliente).

### Alterações

1. **`src/components/AppLayout.tsx`** (linha 20) — breadcrumb do topo
   - De: `crumbs.push({ label: "Clientes/Posts", to: "/clientes" });`
   - Para: `crumbs.push({ label: "Clientes", to: "/clientes" });`

2. **`src/pages/Clientes.tsx`** (linha 1368) — título `<h1>` da página
   - De: `<h1 className="text-xl font-bold leading-tight">Clientes/Posts</h1>`
   - Para: `<h1 className="text-xl font-bold leading-tight">Clientes</h1>`

3. **`src/pages/ProjetoDemandasCliente.tsx`** (linha 77) — breadcrumb interno
   - De: `<span>Clientes/Posts</span>`
   - Para: `<span>Clientes</span>`

### O que NÃO muda
- Rota `/clientes` permanece.
- Comentário interno na linha 1254 de `Clientes.tsx` é mantido (não é visível ao usuário).
- Nenhuma alteração de lógica, apenas texto.
