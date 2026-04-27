# Responsáveis operacionais: Posts e Demandas

Substituir a coluna "Responsáveis do cliente" das tabelas pelas colunas agregadas a partir da operação real, e remover a edição/exibição do responsável geral do cliente da UI. O campo `clientes.responsaveis_ids` permanece no banco (reserva para reativação futura) mas para de ser lido/escrito pelo frontend.

## O que muda visualmente

- **Clientes/Posts** (`/clientes`): coluna **"Responsáveis dos Posts"** (união de `cards.responsaveis_ids` por cliente).
- **Demandas** (`/demandas`): coluna **"Responsáveis das Demandas"** (união de `demandas.responsaveis_ids` por cliente).
- Remover a coluna/célula "Responsáveis do cliente" e o componente `CelulaResponsaveis` de todas as telas (tabelas, detalhe do cliente, formulários de cadastro/edição de cliente).
- Avatares atualizam automaticamente ao criar/alterar post ou demanda (realtime já existente nos stores).

```text
ANTES: [ Responsáveis do cliente ]   ← clientes.responsaveis_ids
DEPOIS:
  /clientes  → [ Responsáveis dos Posts ]      ← união de cards.responsaveis_ids
  /demandas  → [ Responsáveis das Demandas ]   ← união de demandas.responsaveis_ids
```

## Reativação futura (rota deixada pronta)

- A coluna `clientes.responsaveis_ids` **não será removida do banco**.
- Trigger `propagate_responsaveis_cliente` será mantida (inativa na prática, pois nada grava nela pela UI).
- O componente `CelulaResponsaveis.tsx` será mantido no repositório, sem imports — pronto para religar no futuro.
- Comentário `// FUTURO: responsável geral do cliente` nos pontos onde a coluna era exibida.

## Múltiplos responsáveis em Demandas (item 5)

Migração de schema: `demandas.responsavel_id` → `demandas.responsaveis_ids uuid[]`.

- Adicionar `responsaveis_ids uuid[] not null default '{}'`.
- Backfill: `responsaveis_ids = ARRAY[responsavel_id]` quando não nulo.
- Atualizar trigger `log_historico_demanda` para logar mudanças no array.
- Atualizar policy `auth_read_demandas` para `auth.uid() = ANY(responsaveis_ids)`.
- Coluna antiga `responsavel_id` permanece nullable durante a transição (não usada pela UI; remover em migração futura).

## Arquivos afetados

**Tabelas operacionais (nova coluna agregada):**
- `src/components/clientes/ClientesGeralTable.tsx` — header → "Responsáveis dos Posts"; célula renderiza `AvatarStack` da união por cliente; remover `CelulaResponsaveis`.
- `src/components/demandas/ClientesDemandasTable.tsx` — header → "Responsáveis das Demandas"; usar `responsaveis_ids` (array) na agregação e na exibição; remover `CelulaResponsaveis`.

**Remover exibição/edição do responsável geral do cliente:**
- `src/pages/Clientes.tsx` — remover filtro "Apenas minhas" baseado em cliente (já usa posts), remover qualquer chip de responsáveis do cliente.
- `src/pages/ClienteDetalhe.tsx` — remover seção/edit de "Responsáveis" do cliente.
- `src/pages/ProjetoCliente.tsx` — remover blocos que listam responsáveis do cliente.
- Formulário de criar/editar cliente — remover o multi-select de responsáveis.
- Não importar mais `CelulaResponsaveis` em nenhum arquivo (manter o componente no disco).

**Store + tipos (multi responsáveis em demandas):**
- `src/store/demandas.ts` — `responsaveis_ids: string[]`; `assign(id, ids[])`; `createDemanda`/`updateDemanda` com array; suporte de leitura a `responsavel_id` legado (`ids = d.responsaveis_ids?.length ? d.responsaveis_ids : (d.responsavel_id ? [d.responsavel_id] : [])`).

**Diálogos e detalhe:**
- `src/components/demandas/NovaDemandaDialog.tsx` — multi-select (popover com checkboxes); auto-fill por top-1 vira array `[id]`.
- `src/components/demandas/DemandaRapidaDialog.tsx` — idem.
- `src/components/demandas/DemandaDetalheDialog.tsx` — bloco de responsável vira multi-select com toggle.
- `src/components/demandas/DemandCard.tsx` — `AvatarStack` em vez de avatar único.

**Filtros:**
- `src/pages/Demandas.tsx` — filtro `fResp` e "Apenas minhas" usando `includes`.
- `src/pages/ProjetoDemandasCliente.tsx`, `src/pages/ProjetoCliente.tsx` — idem.
- `src/components/demandas/RelatoriosDemandas.tsx` — contagem por responsável usando `includes`.
- `src/pages/Alertas.tsx` — alerta "demanda urgente sem responsável" usa `responsaveis_ids.length === 0`.

**Backend (migração Supabase):**
- ADD COLUMN `responsaveis_ids uuid[] not null default '{}'` em `demandas`.
- Backfill a partir de `responsavel_id`.
- Recriar trigger `log_historico_demanda` para logar mudança no array.
- Atualizar policy `auth_read_demandas`.

## Detalhes técnicos

**Agregação Posts:**
```ts
const respsPostsPorCliente = useMemo(() => {
  const map = new Map<string, Set<string>>();
  cards.forEach(c => {
    const set = map.get(c.cliente_id) ?? new Set<string>();
    (c.responsaveis ?? []).forEach(r => set.add(r));
    map.set(c.cliente_id, set);
  });
  return map;
}, [cards]);
```

**Agregação Demandas:** mesma lógica trocando `cards` por `demandas` e iterando `d.responsaveis_ids ?? (d.responsavel_id ? [d.responsavel_id] : [])`.

**Reatividade:** `useCRM` e `useDemandasStore` já têm subscribe realtime — `useMemo` recalcula sozinho.

## Não muda

- Rotas, tabelas (`clientes`, `cards`, `demandas`), URLs, permissões.
- Coluna `clientes.responsaveis_ids` continua no banco (reserva).
- Componente `CelulaResponsaveis.tsx` continua no repositório (sem uso).
