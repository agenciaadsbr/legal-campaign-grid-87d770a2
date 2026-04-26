
# Plano: Camada de Clientes dentro do módulo Demandas

Objetivo: criar uma hierarquia **Cliente → Projeto → Demanda** dentro do módulo `Demandas`, sem alterar o módulo Clientes, Posts, Kanban de posts ou Cards existentes.

---

## 1. Nova subaba "Clientes" em `src/pages/Demandas.tsx`

Adicionar nova `TabsTrigger value="clientes"` no `<TabsList>` (entre "Quadro Geral" e "Minhas Demandas"). O conteúdo da aba renderiza o novo componente `ClientesDemandasTable`.

Nada do que já existe (Quadro Geral, Minhas, Novas, Calendário, Relatórios) será alterado.

---

## 2. Novo componente `src/components/demandas/ClientesDemandasTable.tsx`

Lista clientes que possuem ao menos uma demanda. Estrutura visual no padrão da tabela do módulo Clientes (mesmas classes / `Table` shadcn), porém **derivada de `useDemandas` + `useCRM`** (não toca em `clientes` como entidade primária — apenas lê).

### Agregação por cliente
Para cada `cliente_id` distinto presente em `demandas`:
- **Nome do cliente** — buscado em `useCRM().clientes`
- **Responsáveis** — união de `responsavel_id` das demandas do cliente, renderizados em `AvatarStack`
- **Última atividade** — `max(updated_at)` das demandas do cliente
- **Total de demandas** — count
- **Demandas atrasadas** — count onde `status === 'Atrasado'`
- **Demandas urgentes** — count onde `prioridade === 'Urgente'`
- **Ações** — botão "Abrir projeto" → navega para `/demandas/cliente/:id`

### Filtros (acima da tabela)
- Busca por nome de cliente (`Input`)
- Filtro por responsável (`Select`)
- Filtro por status (`Select`, usa `STATUS_DEMANDA`)
- Filtro por prioridade (`Select`, usa `PRIORIDADES`)

Os filtros aplicam-se às demandas antes da agregação (ex.: filtro por status mostra apenas clientes que têm demandas naquele status, e os contadores refletem o filtro).

---

## 3. Nova rota `/demandas/cliente/:clienteId`

### 3a. Registrar em `src/App.tsx`
Dentro do bloco protegido pelo `RequireAuth`/`AppLayout`, adicionar:
```tsx
<Route path="/demandas/cliente/:clienteId" element={<ProjetoDemandasCliente />} />
```

### 3b. Nova página `src/pages/ProjetoDemandasCliente.tsx`
Estrutura:
- **Topo**: breadcrumb "Demandas / Clientes / {Nome}" + nome do cliente em destaque + logo (se existir em `clientes.logo_url`).
- **Resumo**: cards pequenos com totais — Total, Em andamento, Atrasadas, Urgentes, Concluídas.
- **Filtros**: responsável, prioridade, categoria, busca por título (mesmos componentes já usados em `Demandas.tsx`).
- **Kanban**: novo componente `ProjetoKanban` com as 6 colunas exigidas: `Planejamento`, `Criar`, `Revisar`, `Entregue`, `Concluido`, `Atrasado` (já são exatamente os valores em `STATUS_DEMANDA`).
- Botão "Nova demanda" no topo (reusa `NovaDemandaDialog` com `cliente_id` pré-preenchido — passar prop opcional).

Reusa `DemandaDetalheDialog` para abrir cards.

---

## 4. Novo componente `src/components/demandas/ProjetoKanban.tsx`

Componente **separado** do `DemandasKanban` atual (que continua intocado). Diferenças:
- Recebe `clienteId` e filtra demandas localmente.
- Reusa visual de `DemandCard` (cards seguem padrão atual conforme requisito 7).
- Drag & drop de status reusando `useDemandas().moveStatus`.
- Em cards na coluna **Planejamento**, exibe botão extra **"Iniciar Demanda"** que executa:
  ```ts
  updateDemanda(d.id, { status: 'Criar', data_inicio: new Date().toISOString() })
  ```
  (Requisito 8.) O botão pode aparecer no rodapé do card ou via overlay/hover; preferimos botão pequeno fixo no card quando `status === 'Planejamento'`.

Para evitar mexer em `DemandCard.tsx` (usado em outras telas), vamos adicionar uma **prop opcional** `extraAction?: ReactNode` em `DemandCard` — não altera comportamento existente, apenas renderiza o slot quando passado. O `ProjetoKanban` injeta o botão "Iniciar Demanda" via essa prop.

---

## 5. Regra de atraso (requisito 10)

Já está garantida pelas funções Postgres existentes:
- `auto_marcar_demanda_atrasada` (trigger) marca `Atrasado` quando `data_limite < now()` e status não é `Concluido/Entregue/Atrasado`.
- `marcar_demandas_atrasadas` (RPC) já é chamada em `useDemandasStore.load()`.

Nada a fazer no banco. Apenas confirmar que a lógica já cobre a regra (status != concluído + data_limite < hoje → Atrasado). **Não** mover tarefas automaticamente por outras datas (requisito 9 — já é o comportamento atual).

---

## 6. Alertas com tag `[DEMANDA]` (requisito 13)

Sempre que uma demanda transitar para `Atrasado` ou for criada como `Urgente`, inserir em `public.alertas` uma linha com:
- `cliente_id` da demanda
- `mensagem` prefixada com `[DEMANDA] ...` (ex.: `[DEMANDA] "Criativo X" está atrasada`)
- `tipo_alerta` reusando enum existente (provavelmente `Atraso` / `Urgente` — vou confirmar lendo o enum no momento da implementação; se não existir, uso o valor padrão mais próximo).
- `status` = `Pendente`

Implementação: dentro de `useDemandasStore.updateDemanda` e `createDemanda`, após sucesso, fazer um `supabase.from('alertas').insert(...)` quando aplicável. Sem migrações de schema.

---

## 7. Itens preservados (requisito 11)

- Módulo `Clientes` (`src/pages/Clientes.tsx`, `ClienteDetalhe.tsx`): **não tocar**.
- Kanban de posts (`PostDetalhe`, `cards`, `posts`): **não tocar**.
- `DemandasKanban` (Quadro Geral): **não tocar**.
- `DemandCard`: apenas adição de prop opcional `extraAction` (backward compatible).
- `cliente_id` reusa o mesmo da tabela `clientes` (requisito 12) — nenhuma duplicação.

---

## 8. Arquivos a criar / modificar

**Criar:**
- `src/components/demandas/ClientesDemandasTable.tsx`
- `src/components/demandas/ProjetoKanban.tsx`
- `src/pages/ProjetoDemandasCliente.tsx`

**Modificar (cirúrgico):**
- `src/pages/Demandas.tsx` — adicionar 1 `TabsTrigger` + 1 `TabsContent`.
- `src/App.tsx` — registrar rota `/demandas/cliente/:clienteId`.
- `src/components/demandas/DemandCard.tsx` — adicionar prop opcional `extraAction`.
- `src/components/demandas/NovaDemandaDialog.tsx` — aceitar `defaultClienteId` opcional.
- `src/store/demandas.ts` — disparar insert em `alertas` ao atrasar / criar urgente (alteração isolada, sem mudar API existente).

**Sem migrações de banco.** Estruturas (`demandas`, `alertas`, triggers) já comportam o requisito.

---

## 9. Validação pós-implementação

- `tsc --noEmit` deve passar.
- Navegar `/demandas` → aba Clientes mostra lista agregada.
- Clicar em um cliente → `/demandas/cliente/:id` abre Kanban filtrado.
- Card em "Planejamento" exibe botão "Iniciar Demanda"; clique muda status para `Criar` e seta `data_inicio`.
- Quadro Geral, Minhas, Novas, Calendário, Relatórios continuam idênticos.
- Módulo Clientes inalterado.
