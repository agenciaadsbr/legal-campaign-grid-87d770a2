## Escopo (estritamente delimitado)

Alteração **apenas** dentro da aba **Visão Geral** da rota `/clientes/:id/projeto` (componente `VisaoGeral` em `src/pages/ProjetoCliente.tsx`).

NÃO será modificado:
- `ClienteDetalhe.tsx` (comportamento ao clicar no cliente, Kanban original de posts, aba Atividade)
- Módulo Demandas, Quadro Geral, Minhas Demandas
- Alertas, Relatórios, Configurações, rotas existentes
- As outras abas do Hub (Posts, Demandas, Atividades, Responsáveis, Relatórios) — continuam idênticas
- Stores (`crm`, `demandas`, `atividades`) — já registram tudo via triggers no Supabase
- Tabela `atividade_cliente` — já existe e já recebe inserts via triggers (`log_atividade_card`, `log_atividade_demanda`, `log_atividade_comentario_*`, `log_atividade_anexo_demanda`)

## Mudanças

### 1. Extrair o Kanban de Posts para um componente reutilizável
Hoje o `KanbanView` (Kanban completo de posts com DnD, filtros, urgência, iniciar tarefa) vive **dentro** de `ClienteDetalhe.tsx` e não é exportado. Precisamos reutilizá-lo na Visão Geral sem duplicar lógica nem alterar a aba "Quadro" original.

**Ação:** criar `src/components/clientes/PostsKanbanCliente.tsx` exportando exatamente o mesmo componente — movendo `CardItem`, `Coluna` e `KanbanView` para esse arquivo. Em seguida:
- `ClienteDetalhe.tsx` passa a importar `PostsKanbanCliente` e usá-lo no lugar do `KanbanView` local (substituição 1-a-1, mesmo JSX, mesmo comportamento).
- `ProjetoCliente.tsx` (Visão Geral) também importa `PostsKanbanCliente`.

Resultado: comportamento idêntico, zero regressão, e o Kanban fica disponível para reuso.

### 2. Reescrever apenas o componente `VisaoGeral`
Substituir o conteúdo atual (cards de status / stats / alertas / última atividade) por três blocos verticais:

```text
┌─────────────────────────────────────────┐
│ POSTS                                   │
│ <PostsKanbanCliente />  (Kanban full)   │
├─────────────────────────────────────────┤
│ DEMANDAS                                │
│ <ProjetoKanban demandas={demandasCli} />│
│ + botão "Nova Demanda"                  │
│ + DemandaDetalheDialog                  │
├─────────────────────────────────────────┤
│ ATIVIDADES                              │
│ Timeline agrupada por dia (Hoje /       │
│ Ontem / data) com "Carregar mais"       │
└─────────────────────────────────────────┘
```

Detalhes:
- **Bloco POSTS**: título "POSTS" + `<PostsKanbanCliente />` (lê `clienteId` da URL via `useParams`, já filtra internamente).
- **Bloco DEMANDAS**: título "DEMANDAS" + botão "Nova Demanda" no canto + `<ProjetoKanban demandas={demandasCli} onOpen={setSelecionada} />` + `NovaDemandaDialog` + `DemandaDetalheDialog` (mesma lógica que já está em `DemandasTab`, apenas reutilizada).
- **Bloco ATIVIDADES**: título "ATIVIDADES" + reusar a timeline já implementada em `AtividadesTab` (agrupamento por dia, paginação 20-por-vez via `useAtividades.loadByCliente`, botão "Carregar mais"). Vou extrair essa timeline em um sub-componente local `TimelineAtividades({ clienteId })` para usar tanto na Visão Geral quanto na aba Atividades, sem duplicar código.

Separação visual: `space-y-8` entre blocos + `Separator` leve. Cada bloco com header `text-sm font-semibold uppercase tracking-wide text-muted-foreground`.

### 3. Performance
- Posts e Demandas já usam stores Zustand carregadas no bootstrap (sem fetch extra).
- Atividades continuam paginadas (20 por página) via `useAtividades` — comportamento já existente.

## Arquivos afetados

- **CRIAR** `src/components/clientes/PostsKanbanCliente.tsx` — extração de `CardItem` + `Coluna` + `KanbanView` (cópia idêntica).
- **EDITAR** `src/pages/ClienteDetalhe.tsx` — remover as definições locais de `CardItem`/`Coluna`/`KanbanView` e importar o novo componente. Aba "Quadro" continua chamando o mesmo Kanban.
- **EDITAR** `src/pages/ProjetoCliente.tsx` — reescrever apenas o componente `VisaoGeral` (linhas 199-355) e adicionar um sub-componente `TimelineAtividades` reutilizado pela aba Atividades existente.

## Garantias

- Nenhuma migração de banco (tabela e triggers já existem).
- Nenhuma alteração de rota.
- Aba "Quadro" de `ClienteDetalhe` permanece visualmente e funcionalmente idêntica.
- Outras abas do Hub (Posts, Demandas, Atividades, Responsáveis, Relatórios) permanecem intactas.
- Drag-and-drop, filtros, urgência, "Iniciar tarefa", abrir card, comentários — tudo continua funcionando porque é o mesmo componente.
