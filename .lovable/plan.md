## Objetivo

Adicionar a opção de **ocultar individualmente cada cliente** do painel principal (`/clientes`) e dos cards/gráficos do Dashboard e Relatórios, mantendo o cliente intacto no banco (sem apagar nada).

A ocultação considera o **status** do cliente como gatilho visual (ex.: cliente "Encerrado" ou "Pausado" pode ser ocultado com 1 clique), mas o controle é por cliente — cada um tem um flag `oculto`.

## Comportamento

- Em cada linha do painel de Clientes, novo botão **"Ocultar do painel"** (ícone `EyeOff`) ao lado das ações existentes. Clique → marca `oculto = true` e o cliente some da lista.
- Toggle no topo do painel: **"Mostrar ocultos"** (switch). Quando ligado, clientes ocultos reaparecem com badge discreto "Oculto" e o botão vira **"Reexibir"**.
- Contador ao lado do toggle: *"3 clientes ocultos"*.
- Sugestão automática: ao mudar status para `Encerrado`, toast com ação "Ocultar do painel".
- **Dashboard e Relatórios**: clientes ocultos são filtrados das listagens, KPIs, gráficos de status e renovações. Nenhum dado é apagado — apenas filtrado em runtime.

## O que **não** muda

- Demandas, posts, contratos, alertas e atividades do cliente continuam intactos.
- Kanbans dentro do Projeto Completo continuam funcionando para clientes ocultos (acessíveis via link direto).
- Tabela `clientes` ganha apenas uma coluna nova; nada é removido.

## Mudanças técnicas

### 1. Banco (migration)

Adicionar 2 colunas em `public.clientes`:
- `oculto boolean NOT NULL DEFAULT false`
- `oculto_em timestamptz` (registra quando foi ocultado, para auditoria/UI)

Index parcial para queries rápidas:
```text
CREATE INDEX idx_clientes_oculto ON public.clientes(oculto) WHERE oculto = true;
```

Nenhuma policy nova — herda as RLS existentes de `clientes`.

### 2. Store (`src/store/crm.ts`)

- Tipo `Cliente` ganha `oculto?: boolean` e `oculto_em?: string | null`.
- Nova função `toggleOcultarCliente(id, oculto)` que faz `update` no Supabase e atualiza o estado local.

### 3. UI — Painel principal (`src/pages/Clientes.tsx`)

- Estado local `mostrarOcultos` (persistido em `localStorage`).
- Filtro: por padrão exclui `cliente.oculto === true`.
- Header: switch "Mostrar ocultos" + contador.
- Linha da tabela: botão `EyeOff`/`Eye` com tooltip "Ocultar do painel" / "Reexibir".
- Badge "Oculto" (variante muted) quando exibido com toggle ligado.

### 4. Dashboard e Relatórios

- `src/pages/Dashboard.tsx`, `src/components/dashboard/*` e `src/pages/Relatorios.tsx`: aplicar `.filter(c => !c.oculto)` nas listas de clientes consumidas para KPIs, donut de status, próximos prazos, renovações e gráficos.
- Sem alterar lógica de negócio — apenas filtro de visualização.

## Arquivos afetados

- `supabase/migrations/<timestamp>_add_clientes_oculto.sql` (novo)
- `src/store/crm.ts`
- `src/pages/Clientes.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/StatusClientesDonut.tsx`
- `src/components/dashboard/ProximosPrazosCard.tsx`
- `src/components/dashboard/RenovacoesCard.tsx`
- `src/components/dashboard/DashboardPorColaborador.tsx`
- `src/pages/Relatorios.tsx`

## Garantias

- Nenhum dado existente é apagado.
- Nenhum kanban, demanda ou funcionalidade é alterado.
- Layout geral preservado — apenas 1 botão por linha + 1 switch no header do painel de Clientes.