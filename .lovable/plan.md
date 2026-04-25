## Objetivo

Separar **estruturalmente** os status de Clientes e os status de Posts (cards/posts/Kanban), mantendo ambos visíveis no painel **Clientes**, e criar uma nova seção em **Configurações do painel → Status de Posts**.

Hoje o sistema mistura tudo em `status_options` e usa colunas fixas (`"Criar" | "Revisar" | "Agendar" | "Postado" | "Renovação"`) hardcoded no Kanban e no PostDetalhe. Vamos resolver isso.

---

## Etapa 1 — Banco: nova tabela `status_post_options`

Reaproveitar `status_options` **apenas** para Clientes (já está em uso assim). Criar tabela espelho para Posts:

```sql
CREATE TABLE public.status_post_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  cor text NOT NULL DEFAULT '#9ca3af',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.status_post_options ENABLE ROW LEVEL SECURITY;

-- RLS espelhando status_options
CREATE POLICY auth_read_status_post_options ON public.status_post_options
  FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_status_post_options_insert ON public.status_post_options
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY admin_status_post_options_update ON public.status_post_options
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY admin_status_post_options_delete ON public.status_post_options
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
```

**Seeds idempotentes** (só insere se vazio): Criar(cinza), Revisar(roxo), Agendado(azul), Postado(verde), Atrasado(vermelho).

**Garantir seeds de Status de Clientes** (idempotente em `status_options`): Ativo, Pausado, Próximo da Renovação, Finalizado — apenas se faltarem.

### Converter `cards.status` e `posts.status` de enum para `text`
Hoje são `status_card` enum (`'ideias' | 'Criar' | 'Revisar' | 'Agendar' | 'Postado' | 'Renovação'`), o que impede status dinâmicos. Mesma estratégia já aplicada a `clientes.status`:

```sql
ALTER TABLE public.cards ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.cards ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.cards ALTER COLUMN status SET DEFAULT 'Criar';

ALTER TABLE public.posts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.posts ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.posts ALTER COLUMN status SET DEFAULT 'Criar';

-- Migra registros antigos: 'ideias' → 'Criar'; 'Agendar' → 'Agendado'
UPDATE public.cards SET status = 'Criar' WHERE status IN ('ideias','Renovação');
UPDATE public.cards SET status = 'Agendado' WHERE status = 'Agendar';
UPDATE public.posts SET status = 'Criar' WHERE status IN ('ideias','Renovação');
UPDATE public.posts SET status = 'Agendado' WHERE status = 'Agendar';
```

A trigger `sync_post_status_with_card` continua funcionando (compara texto).

### Job automático "Atrasado"
Habilitar `pg_cron` + `pg_net` e agendar a cada 1h:

```sql
UPDATE public.cards
   SET status = 'Atrasado'
 WHERE status <> 'Postado'
   AND data_agendada IS NOT NULL
   AND data_agendada < now();
```

---

## Etapa 2 — Store (`src/store/crm.ts`)

- Trocar `StatusCard` para `string` puro (dinâmico).
- Adicionar estado `statusPostOptions: DropdownOption[]` carregado em `_loadAll` (`from("status_post_options").order("ordem")`).
- Adicionar ações: `addStatusPostOption`, `updateStatusPostOption`, `deleteStatusPostOption`, `reorderStatusPostOptions` (mesmo padrão das de cliente, com checagem de duplicidade e propagação de renomeação para `cards.status`/`posts.status`).
- Incluir `status_post_options` na lista de tabelas do `startRealtime`.
- `moveCard`/`updatePost` continuam recebendo string livre.

---

## Etapa 3 — UI: novo `OpcoesEditor` parametrizável para Status de Posts

`OpcoesEditor` hoje aceita `tipo: "status" | "nicho"`. Adicionar `tipo: "status_post"` reaproveitando o mesmo componente:

- Quando `status_post`: usa `statusPostOptions`, conta uso em `cards`+`posts` (`status === label`), chama as novas ações da store, com **drag-and-drop** já existente (`reorderStatusPostOptions`).
- Mesma UI de cor + ColorBadge "filled" (padrão visual já definido).

---

## Etapa 4 — Painel Clientes: adicionar seção "Status de Posts" em Configurações do painel

Em `src/pages/Clientes.tsx` (Sheet de Configurações, linha ~602), adicionar 3º card abaixo de "Status do Cliente" e "Nichos":

```tsx
<Card>
  <CardHeader className="py-3"><CardTitle className="text-sm">Status de Posts</CardTitle></CardHeader>
  <CardContent><OpcoesEditor tipo="status_post" /></CardContent>
</Card>
```

Mantém Status do Cliente onde está (já agrupando o painel por status dinâmico).

---

## Etapa 5 — Kanban dinâmico (`src/pages/ClienteDetalhe.tsx`)

- Remover `const COLUNAS: StatusCard[] = [...]` fixo.
- Trocar por: `const COLUNAS = useCRM(s => s.statusPostOptions).map(o => o.label)`.
- Cabeçalho da coluna passa a usar `ColorBadge` com a cor do status (visual igual ao painel Clientes).
- Drag-and-drop continua chamando `moveCard(cardId, novoStatus)` — agora aceita qualquer string.

`StatusBadge` (componente atual com mapa fixo) ganha fallback: se o status não está no `statusMap` legado, busca em `statusPostOptions` e renderiza `ColorBadge` com a cor da tabela.

---

## Etapa 6 — `PostDetalhe.tsx`

- Remover `const STATUS: StatusCard[] = [...]` fixo.
- Popular o `<Select>` de status do post a partir de `statusPostOptions` da store.

---

## Etapa 7 — Sincronização e proteções

- Realtime já cobre as tabelas via `startRealtime` (basta incluir `status_post_options`).
- Validação contra duplicidade (case-insensitive) já existe no padrão de `addStatusOption` — replicar.
- Seeds só rodam em tabela vazia (não resetam dados do usuário).
- Renomear um status renomeia todos os `cards.status`/`posts.status` correspondentes (assim como já é feito para clientes).
- Excluir um status reatribui registros para o primeiro status restante (mesmo padrão de `deleteStatusOption`).

---

## Arquivos afetados

- **Nova migração SQL** (tabela `status_post_options`, RLS, seeds idempotentes, conversão de enum→text em `cards`/`posts`, cron de "Atrasado").
- `src/store/crm.ts` — novos estados/ações + realtime.
- `src/components/OpcoesEditor.tsx` — suporte a `tipo: "status_post"`.
- `src/pages/Clientes.tsx` — novo card "Status de Posts" no Sheet de configurações.
- `src/pages/ClienteDetalhe.tsx` — Kanban dinâmico.
- `src/pages/PostDetalhe.tsx` — Select dinâmico.
- `src/components/StatusBadge.tsx` — fallback para status dinâmicos de posts.

## Resultado final

- Status de Clientes e de Posts vivem em tabelas separadas, sem reset.
- Painel **Clientes** mantém agrupamento por Status de Cliente; ao abrir um cliente, o **Kanban usa Status de Posts dinâmicos**.
- Nova aba **Configurações → Status de Posts** com CRUD + drag-and-drop + cores.
- Job "Atrasado" automático a cada 1h.
- Tudo sincronizado em tempo real.