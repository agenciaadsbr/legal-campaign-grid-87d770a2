
## 🎯 Objetivo

Eliminar a duplicidade entre os dois campos de status que aparecem no dialog "Editar Cliente":

- ❌ **"Status"** (canto direito) — campo legado, dinâmico, vinha do `status_options` ("ATIVO", "ONBOARDING", "INADIMPLENTE"…)
- ✅ **"Status do cliente (ciclo de vida)"** — campo novo da última atualização (Onboarding / Ativo / Pausado / Encerrado)

Manter apenas **UM campo unificado** = o ciclo de vida (Onboarding/Ativo/Pausado/Encerrado), que já é a fonte usada por:
- Badge ao lado do nome
- KPIs do Dashboard
- Alertas de Onboarding
- Filtros de Demandas > Clientes
- Nova "Visão por Clientes"

---

## 🗄️ 1. Migração de dados (SQL — sem mudar schema)

A coluna física `clientes.status` (legado) será **mantida no banco** por compatibilidade (Contratos, ClienteDetalhe e OpcoesEditor ainda referenciam), mas:

1. Para cada cliente, **sincronizar** `clientes.status` ← `clientes.status_cliente` (o novo ciclo de vida) usando mapeamento:
   - `Onboarding` → `Onboarding`
   - `Ativo` → `Ativo`
   - `Pausado` → `Pausado`
   - `Encerrado` → `Encerrado`
2. A partir daqui, os 2 campos sempre andam juntos via store.

> Nenhuma `ALTER TABLE` necessária — apenas `UPDATE` de dados (via insert tool).

---

## 🧠 2. Store (`src/store/crm.ts`)

- `Cliente.status_cliente` deixa de ser um campo independente e passa a ser **derivado** de `status_global` (sempre o mesmo valor).
- `addCliente`: gravar **o mesmo valor** do ciclo de vida em `status` E `status_cliente` no DB.
- `updateCliente`: ao alterar `status_global`, atualizar **ambas** colunas no DB simultaneamente. Remover o branch que aceitava `patch.status_cliente` separado.
- `mapCliente`: `status_cliente` passa a refletir `row.status_cliente` (não mais `row.status`).

---

## 🎨 3. UI — Dialog Novo/Editar Cliente (`src/pages/Clientes.tsx`)

- **Remover** o `<Select>` "Status" (linhas ~243 e ~449) do dialog Novo/Editar.
- **Manter apenas** o campo "Status do cliente" (atual `status_global`), renomeando o label para simplesmente **"Status"**.
- Opções: Onboarding, Ativo, Pausado, Encerrado (do `STATUS_CLIENTE_OPCOES`).
- Limpar o estado `form.status_cliente` do componente (não vai mais ao formulário).

Resultado visual: **um único campo "Status"** no dialog, igual ao print mas só com o de baixo.

---

## 🔍 4. Filtros e telas dependentes

- `src/pages/Clientes.tsx` linha 1297: o filtro "Status do cliente" passa a operar sobre `status_global` (já existe um filtro novo para isso — manter só esse, remover o legado).
- `src/pages/Dashboard.tsx` linha 34 (`renovacao`): substituir referência a `"Próximo da renovação"` por uma métrica baseada em `prazo_onboarding` próximo do vencimento (ou remover o KPI obsoleto, mantendo só os 3 novos).
- `src/pages/Alertas.tsx` linhas 88/93: trocar `c.status_cliente` por `c.status_global`.
- `src/pages/ClienteDetalhe.tsx` linha 437 e `src/pages/Contratos.tsx` linha 28: como o `status_options` dinâmico não será mais a fonte, exibir o badge usando `StatusClienteBadge` (ciclo de vida) em vez de `ColorBadge` baseado em `statusOptions`.
- `src/components/OpcoesEditor.tsx` linha 234: a contagem de uso do `status_options` deixa de ser relevante para clientes — ocultar a seção "Status de Clientes" do editor de opções OU manter apenas leitura informando que está descontinuado.

---

## ✅ 5. Resultado final esperado

- 1 só campo "Status" no formulário do cliente.
- Valores possíveis padronizados: **Onboarding · Ativo · Pausado · Encerrado**.
- Badge, KPIs, alertas, filtros e tabelas todos consistentes.
- Sem perda de dados — o campo legado `clientes.status` continua preenchido (espelho), garantindo que nada quebra.
- Kanban de posts e demais módulos **não são afetados**.

---

## 📋 Arquivos que serão alterados

1. `src/store/crm.ts` — unificar gravação/leitura
2. `src/pages/Clientes.tsx` — remover campo duplicado dos 2 dialogs
3. `src/pages/Dashboard.tsx` — corrigir KPI de renovação
4. `src/pages/Alertas.tsx` — trocar para `status_global`
5. `src/pages/ClienteDetalhe.tsx` — badge unificado
6. `src/pages/Contratos.tsx` — badge unificado
7. `src/components/OpcoesEditor.tsx` — ocultar seção legada
8. **Migração de dados** (SQL `UPDATE`) — sincronizar `clientes.status` com `clientes.status_cliente`

Aprove para eu executar a unificação.
