
# Separação Global: Posts vs Demandas Diárias

Aplicar a regra "Posts são posts, Demandas são demandas, Cliente é só o cliente" em todo o sistema. Nada de somar contadores ou misturar responsáveis. O Projeto Completo apenas consolida — exibe lado a lado, nunca somando.

---

## Princípios (válidos para qualquer painel)

| Conceito | Fonte de verdade | NUNCA usar como fallback |
|---|---|---|
| Responsáveis dos Posts | `cards.responsaveis_ids` | demandas / cliente |
| Responsáveis das Demandas | `demandas.responsaveis_ids` (com fallback legado para `responsavel_id`, via `getResponsaveisIds`) | cards / cliente |
| Contador de Posts | `cards` (filtrado por cliente) | — |
| Contador de Demandas | `demandas` (filtrado por cliente) | — |
| Status do Post | `cards.status` | — |
| Status da Demanda | `demandas.status` | — |

`clientes.responsaveis_ids` permanece no banco (já oculto da UI), nunca usado como fallback.

---

## 1. Projeto Completo — `src/pages/ProjetoCliente.tsx`

### 1.1 Visão Geral — adicionar bloco de KPIs separados (acima do Kanban de Posts)

Dois cards lado a lado, claramente rotulados:

```text
┌─ POSTS ─────────────────────┐  ┌─ DEMANDAS DIÁRIAS ──────────┐
│ Total: N                    │  │ Total: N                    │
│ Pendentes: N                │  │ Pendentes: N                │
│ Atrasados: N                │  │ Atrasadas: N                │
│ Responsáveis: [avatares]    │  │ Responsáveis: [avatares]    │
└─────────────────────────────┘  └─────────────────────────────┘
```

- Pendentes (Posts) = `status ∉ {Postado}`
- Atrasados (Posts) = `status === 'Atrasado'`
- Pendentes (Demandas) = `status ∉ {Concluido, Entregue}`
- Atrasadas (Demandas) = `status === 'Atrasado'`
- Responsáveis dos Posts = união de `cards.responsaveis_ids` deste cliente
- Responsáveis das Demandas = união de `getResponsaveisIds(d)` deste cliente

### 1.2 Aba Responsáveis — reescrever

Hoje usa `cliente.responsaveis` (responsável geral, proibido). Substituir por **duas seções separadas**:

- **Responsáveis dos Posts** — cards apenas com métricas de posts (Posts, Posts abertos, Posts atrasados). Lista = união de `cards.responsaveis_ids` do cliente.
- **Responsáveis das Demandas** — cards apenas com métricas de demandas (Demandas, Demandas abertas, Demandas atrasadas). Lista = união de `getResponsaveisIds` das demandas do cliente.

Uma mesma pessoa pode aparecer nas duas seções, com escopos diferentes — é desejado.

### 1.3 Aba Relatórios — separar contadores

Substituir o filtro "Tipo (todos/posts/demandas)" por **duas grades de KPIs lado a lado** (Posts e Demandas), cada uma com Volume, Entregues, Atrasos, % Atraso. O gráfico "Distribuição por responsável" continua, mas com dois conjuntos:
- Série **Posts**: barras só de quem está em `cards.responsaveis_ids`.
- Série **Demandas**: barras só de quem está em `demandas.responsaveis_ids`.

Filtro de responsável passa a ter um seletor de origem: `Posts | Demandas | Ambos (separados)`.

---

## 2. Cliente Detalhe — `src/pages/ClienteDetalhe.tsx`

Substituir o bloco "Responsáveis" (que usa `cliente.responsaveis`) por **dois subtítulos**: "Responsáveis dos Posts" e "Responsáveis das Demandas", cada um com seu `AvatarStack` derivado das fontes corretas.

---

## 3. Dashboard — `src/pages/Dashboard.tsx`

- KPIs de posts continuam (renomear "Posts hoje/Agendados/Postados" para deixar claro que são Posts).
- Adicionar **linha de KPIs de Demandas Diárias** logo abaixo: Demandas abertas, Demandas urgentes, Demandas atrasadas, Demandas em revisão, Demandas concluídas hoje (já existe em `DashboardDemandasSection`, garantir que a seção rotula claramente "Demandas Diárias").
- Gráfico "Carga por responsável" hoje conta só `cards`. Renomear para **"Carga por responsável — Posts"** e adicionar gráfico equivalente **"Carga por responsável — Demandas"** usando `getResponsaveisIds`.

---

## 4. Relatórios — `src/pages/Relatorios.tsx`

Já está separado em abas Posts/Demandas. Garantir que a aba Posts use só `cards` (ok hoje) e a aba Demandas use só `demandas`. Renomear título das abas para "Posts" e "Demandas Diárias" para reforçar.

---

## 5. Alertas — `src/pages/Alertas.tsx`

Hoje alertas derivados de demandas reusam o tipo `Posts_Pendentes` / `Posts_Atrasados`, o que mistura semântica. Adicionar dois novos tipos lógicos só para exibição (rótulo/cor), sem migration:

- `Demandas_Atrasadas` (badge `[DEMANDA]`, cor vermelha)
- `Demandas_Sem_Responsavel` (badge `[DEMANDA]`, cor âmbar)

Como são alertas derivados (não persistidos), basta um campo virtual `_tipoExibicao` na função `useAlertasDemandas` e adaptar o render do badge/cor sem alterar o enum do banco. Mensagens passam de "Posts_Pendentes" → labels claros: "DEMANDA — atrasada" / "DEMANDA — urgente sem responsável".

---

## 6. Filtros globais de responsável

Em qualquer painel com filtro de responsável que cruza posts e demandas (Projeto Completo › Relatórios; Dashboard se aplicável), seguir o padrão:

```text
[Origem do responsável ▾]   [Responsável ▾]
   ├─ Posts                    (lista única)
   ├─ Demandas
   └─ Ambos (separados)
```

- **Posts** → filtra apenas por `cards.responsaveis_ids`.
- **Demandas** → filtra apenas por `demandas.responsaveis_ids` (via `getResponsaveisIds`).
- **Ambos (separados)** → mostra duas séries/colunas paralelas, nunca soma.

Painéis monotemáticos (página `/clientes` só posts, página `/demandas` só demandas) já estão corretos — manter como estão.

---

## 7. Garantias de não-mistura (checklist a aplicar nos componentes)

- Nenhum `cliente.responsaveis` em UI operacional (apenas em telas administrativas, se reativadas no futuro).
- Nenhum contador agrega `cards.length + demandas.length`.
- Nenhum gráfico mistura série Posts e Demandas em uma única barra empilhada sem rótulo.
- Toda label de coluna/seção usa "Responsáveis dos Posts" ou "Responsáveis das Demandas" — nunca "Responsáveis" sozinho em contexto operacional.

---

## Detalhes técnicos

**Helpers já existentes**:
- `getResponsaveisIds(d)` em `src/store/demandas.ts` (cobre `responsaveis_ids` + fallback legado `responsavel_id`).
- `respsPostsPorCliente` (padrão já usado em `ClientesGeralTable`) — reaproveitar lógica em ProjetoCliente.

**Sem mudanças de schema**: tudo é refator de UI/agregação sobre os campos já existentes (`cards.responsaveis_ids`, `demandas.responsaveis_ids`, `demandas.responsavel_id` legado).

**Sem novas migrations / sem novos tipos de DB**. Só ajustes em React/TS.

**Arquivos editados**:
- `src/pages/ProjetoCliente.tsx` (Visão Geral, Responsáveis, Relatórios)
- `src/pages/ClienteDetalhe.tsx` (bloco responsáveis)
- `src/pages/Dashboard.tsx` (KPIs e gráfico)
- `src/pages/Relatorios.tsx` (renomeação de abas)
- `src/pages/Alertas.tsx` (rótulos/cores dos alertas de demandas)
