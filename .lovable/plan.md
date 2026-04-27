# Renomear módulo para "Clientes/Posts" e separar responsáveis por contexto

Mudança puramente visual + ajuste de filtro. **Sem alterar banco, rotas, URLs, tabelas, slugs ou permissões.**

---

## Parte 1 — Rótulos visuais

Trocar o texto "Clientes" por **"Clientes/Posts"** nos seguintes pontos:

| Arquivo | Linha | Onde |
|---|---|---|
| `src/components/AppSidebar.tsx` | 19 | Item do menu lateral |
| `src/components/AppLayout.tsx` | 20 | Breadcrumb |
| `src/pages/Clientes.tsx` | 1238 | `<h1>` título da página |
| `src/pages/ProjetoDemandasCliente.tsx` | 77 | Texto no breadcrumb |

**Não alterar:**
- `src/pages/Clientes.tsx` linha 1247 — `<ToggleGroupItem value="clientes">Clientes</ToggleGroupItem>`: é o toggle interno "Clientes / Geral" da própria página. Manter "Clientes" para não poluir o switcher.
- `src/pages/Demandas.tsx` linha 212 — `<TabsTrigger value="clientes">Clientes</TabsTrigger>`: é uma aba dentro do módulo Demandas que lista clientes; manter como está.

---

## Parte 2 — Separação de responsáveis por contexto

Atualmente (após o último ajuste), o filtro de responsáveis no módulo **Demandas** considera tanto o `responsavel_id` da demanda quanto os responsáveis gerais do cliente. Isso mistura contextos. Vamos separar:

### 2.1 Módulo Demandas → filtra **somente pelo responsável da demanda**

**`src/pages/Demandas.tsx`** (linhas 64–75): remover o fallback por responsáveis do cliente.

```ts
// antes
const clientesPorResp = new Map(clientes.map((c) => [c.id, c.responsaveis ?? []]));
...
if (fResp !== "todos") {
  const matchDemanda = d.responsavel_id === fResp;
  const matchCliente = (clientesPorResp.get(d.cliente_id) ?? []).includes(fResp);
  if (!matchDemanda && !matchCliente) return false;
}

// depois
if (fResp !== "todos" && d.responsavel_id !== fResp) return false;
```

**`src/components/demandas/ClientesDemandasTable.tsx`** (linhas 43–60 e relacionados): remover a lógica `clienteIdsComRespNoCard` que inclui clientes só pelo responsável geral. Cliente só aparece se tiver demanda com `responsavel_id === filtroResp`.

### 2.2 Módulo Clientes/Posts → já está correto

`src/components/clientes/PostsKanbanCliente.tsx` (linha 256) já filtra cards por `card.responsaveis` (responsáveis do post/cronograma). **Nenhuma mudança necessária.**

### 2.3 Responsável geral do cliente → permanece opcional

O campo `cliente.responsaveis` continua existindo no banco e na UI de cadastro do cliente (sem alteração). Apenas deixa de influenciar os filtros de Demandas e de Clientes/Posts.

---

## Resultado esperado

- Sidebar/breadcrumb/título mostram **"Clientes/Posts"**.
- Filtro "Responsável" em **Demandas** lista apenas demandas onde `responsavel_id` bate com o selecionado.
- Filtro "Responsável" em **Clientes/Posts** lista apenas cards/posts atribuídos àquele responsável.
- Responsável geral do cliente fica isolado do cadastro do cliente, sem efeito cruzado.
- Banco, rotas, RLS, edge functions e tabelas: intactos.
