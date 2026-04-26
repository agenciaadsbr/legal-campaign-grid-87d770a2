## Diagnóstico

Após inspecionar o código, identifiquei dois pontos onde **clientes cadastrados não aparecem automaticamente** no módulo Demandas:

### 1. Aba "Clientes" (`ClientesDemandasTable.tsx`) — PROBLEMA PRINCIPAL
A tabela é construída **iterando apenas sobre `demandas`** e agrupando por `cliente_id`. Resultado: clientes que ainda **não têm nenhuma demanda criada não aparecem na lista**. O usuário precisa abrir um cliente para começar a criar demandas — mas hoje ele só vê o cliente depois que já existe demanda, criando um beco sem saída.

### 2. Filtros e dropdowns (`Demandas.tsx`)
O dropdown "Cliente" já lê `clientes` direto do `useCRM()` (linha 128), portanto **lista todos os clientes corretamente** — desde que o CRM esteja carregado. O `useCRMBootstrap()` já roda no `AppLayout`, então isso funciona globalmente. ✅

### 3. Página `ProjetoDemandasCliente.tsx`
Usa `clientes.find(...)` corretamente. ✅

## Plano de correção

### A) `src/components/demandas/ClientesDemandasTable.tsx`
- **Inicializar o `Map` com TODOS os clientes** vindos de `useCRM()` antes de iterar pelas demandas, para que cada cliente cadastrado apareça na tabela mesmo com 0 demandas (total/atrasadas/urgentes = 0).
- Manter a ordenação por última atividade, mas usar `cliente.created_at` como fallback para clientes sem nenhuma demanda.
- Manter os filtros de Responsável/Status/Prioridade aplicados às demandas — clientes que não casam com filtros estritos (responsável, status, prioridade) continuam aparecendo apenas se o usuário **não** restringir, ou ficam ocultos quando o filtro restringe explicitamente (comportamento intuitivo).
- Garantir que a busca por nome continue funcionando sobre a lista completa.
- O clique na linha continua navegando para `/demandas/cliente/:id`, permitindo criar a primeira demanda diretamente.

### B) `src/pages/Demandas.tsx`
- Garantir que o dropdown "Cliente" use `clientes` ordenados por `nome_cliente` (atualmente vem na ordem do banco — `created_at desc`). Pequeno ajuste de UX para facilitar localização.
- Sem outras mudanças funcionais — o filtro já lista todos.

### C) Garantia de carregamento (defensivo)
- Adicionar `useCRMBootstrap()` também na página `Demandas.tsx` (idempotente — o store já tem guarda interna `realtimeStarted` e `loaded`). Isso garante que, se o usuário abrir `/demandas` por link direto antes do `AppLayout` montar plenamente, os clientes ainda assim sejam carregados.

### Resultado esperado
- Aba **Clientes** lista 100% dos clientes cadastrados, mesmo sem demandas, com contadores zerados e botão "Abrir" funcional.
- Dropdown **Cliente** nos filtros lista todos em ordem alfabética.
- Novos clientes cadastrados em `/clientes` aparecem **automaticamente** no módulo Demandas (já existe realtime no `useCRM`).

## Arquivos que serão alterados
1. `src/components/demandas/ClientesDemandasTable.tsx` — inicializar Map com todos os clientes.
2. `src/pages/Demandas.tsx` — ordenar dropdown de clientes + bootstrap defensivo do CRM.