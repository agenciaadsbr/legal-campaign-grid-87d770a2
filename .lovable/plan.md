
# Hub Central do Cliente — "Ver Projeto Completo"

## Princípio inegociável
Tudo será feito por **adição**. Nada do fluxo atual será alterado:
- Clicar no cliente em `/clientes` continua abrindo o Kanban atual de posts (`/clientes/:clienteId` → `ClienteDetalhe.tsx`).
- Kanban de posts, cards, regras e layout permanecem idênticos.
- Kanban de demandas atual continua igual.
- A nova tela é uma rota separada, acessada por um botão novo.

---

## 1. Banco de Dados (1 migração nova)

Criar tabela `atividade_cliente` para timeline unificada:

```sql
CREATE TABLE public.atividade_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('post','demanda')),
  acao text NOT NULL,                  -- 'criado','editado','comentario','status','anexo','iniciado','concluido','atrasado','aprovado'
  referencia_id uuid,                  -- post_id ou demanda_id
  usuario_id uuid,
  descricao text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_atividade_cliente_cliente ON public.atividade_cliente(cliente_id, created_at DESC);

ALTER TABLE public.atividade_cliente ENABLE ROW LEVEL SECURITY;
-- SELECT autenticado, INSERT can_write, DELETE admin (mesmo padrão das outras tabelas)
```

**Triggers automáticos** (registram atividade sem alterar nada do app):
- Em `cards`: AFTER INSERT/UPDATE de status → registra `tipo='post'`.
- Em `posts`: AFTER UPDATE (status, novo comentário em `comentarios` jsonb) → registra.
- Em `comentarios` (post): AFTER INSERT → registra `acao='comentario'`.
- Em `demandas`: AFTER INSERT/UPDATE de `status`, `data_inicio`, `data_conclusao` → registra `tipo='demanda'`.
- Em `comentarios_demandas`: AFTER INSERT → registra `acao='comentario'`.
- Em `anexos_demandas`: AFTER INSERT → registra `acao='anexo'`.

Isso preserva 100% o comportamento atual — apenas alimenta a timeline em background.

---

## 2. Nova rota

Adicionar em `src/App.tsx`:

```tsx
<Route path="/clientes/:clienteId/projeto" element={<ProjetoCliente />} />
```

A rota antiga `/clientes/:clienteId` (Kanban de posts) **não muda**.

---

## 3. Botão "Ver projeto completo"

Em `src/pages/ClienteDetalhe.tsx`, no topo (próximo ao título/filtros do cliente), adicionar:

```tsx
<Button variant="outline" size="sm" asChild>
  <Link to={`/clientes/${clienteId}/projeto`}>
    <LayoutDashboard className="h-4 w-4 mr-1" /> Ver projeto completo
  </Link>
</Button>
```

Nenhuma outra alteração nessa página.

---

## 4. Nova página `src/pages/ProjetoCliente.tsx`

Layout:
```
[← Voltar] Clientes / [Nome] / Projeto
[Logo] Nome do Cliente   [StatusClienteBadge]
[Tabs]: Visão Geral | Posts | Demandas | Atividades | Responsáveis | Relatórios
```

Usa `Tabs` do shadcn já disponível.

### 4.1 Aba **Visão Geral** (default)
Cards de resumo, lendo dados já carregados de `useCRM` e `useDemandas`:
- **Status**: `StatusClienteBadge` + prazo de onboarding.
- **Posts**: contagem por status (Planejamento / Criar / Revisar / Atrasado / Postado) filtrando `cards` por `cliente_id`.
- **Demandas**: abertas, urgentes, atrasadas, concluídas.
- **Alertas**: posts atrasados, demandas atrasadas, onboarding com `prazo_onboarding < hoje`.
- **Última atividade**: 5 últimos eventos da `atividade_cliente`.

### 4.2 Aba **Posts**
**Reutiliza** o componente já existente — renderiza `<ClienteDetalhe />` embutido OU extrai o Kanban interno em um sub-componente `<PostsKanbanCliente clienteId={...} />`. Sem recriar lógica nem alterar o original; se necessário, a extração será mínima (mover o JSX do Kanban para um componente filho que `ClienteDetalhe` continua usando exatamente como hoje).

### 4.3 Aba **Demandas**
Reutiliza `<ProjetoKanban demandas={filtradas} onOpen={...} />` (já existente em `ProjetoDemandasCliente.tsx`), filtrando por `cliente_id`. Mesmo dialog de detalhe (`DemandaDetalheDialog`) e `NovaDemandaDialog`.

### 4.4 Aba **Atividades** (timeline)
- Lista paginada (20 por página) de `atividade_cliente` por `cliente_id`, ordenada por `created_at desc`.
- Agrupada por dia, com ícone diferenciando `[POST]` vs `[DEMANDA]`, nome do usuário (join com `responsaveis`/`profiles`) e descrição.

### 4.5 Aba **Responsáveis**
Tabela: por responsável do cliente, contagens de:
- posts atribuídos / em aberto / atrasados;
- demandas atribuídas / em aberto / atrasadas.

### 4.6 Aba **Relatórios**
Filtros: responsável, categoria (das demandas), tipo (post/demanda), período.
Métricas:
- Volume de entregas (posts postados + demandas concluídas).
- % atrasos.
- Distribuição por responsável (gráfico simples com `recharts` já instalado).

---

## 5. Store / dados

Criar `src/store/atividades.ts` (zustand) com:
- `loadByCliente(clienteId, { limit, offset })`
- cache por cliente
- realtime opcional (escutar `atividade_cliente` por cliente_id) — pode ficar para depois.

Posts e demandas continuam vindo de `useCRM` e `useDemandas` — sem duplicar.

---

## 6. Compatibilidade

- Nenhum componente removido.
- Nenhum comportamento alterado em `/clientes`, `/clientes/:id`, `/demandas`, `/demandas/cliente/:id`.
- Triggers só **inserem** em `atividade_cliente`; não modificam dados existentes.
- Se os triggers falharem, o app continua funcionando (usaremos `EXCEPTION WHEN OTHERS THEN NULL` nos triggers de log para garantir).

---

## 7. Ordem de execução

1. Migração: tabela `atividade_cliente` + RLS + triggers.
2. Store `atividades.ts`.
3. Página `ProjetoCliente.tsx` com as 6 abas (Visão Geral, Posts, Demandas, Atividades, Responsáveis, Relatórios).
4. Rota em `App.tsx`.
5. Botão "Ver projeto completo" em `ClienteDetalhe.tsx`.
6. (Opcional, se necessário) extrair o Kanban de posts de `ClienteDetalhe` para um sub-componente reutilizável — mantendo o uso original intacto.

---

## Resultado

- `/clientes` → comportamento atual preservado.
- `/clientes/:id` → Kanban de posts atual + novo botão "Ver projeto completo".
- `/clientes/:id/projeto` → novo HUB com 6 abas integrando posts, demandas, timeline, responsáveis e relatórios.
- Sistema passa a ter visão por tarefa (posts), por operação (demandas) e por cliente (HUB).
