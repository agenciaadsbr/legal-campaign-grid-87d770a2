# Fase 1 — Schema inicial do banco no Supabase

Migração SQL única. Sem alterações em código React nesta fase.

## 1. Enums

```sql
create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.status_cliente as enum ('ativo', 'pausado', 'inativo');
create type public.status_card as enum ('ideias','producao','aprovacao','agendado','publicado','arquivado');
```

## 2. Tabelas

### `responsaveis` (independente de auth.users nesta fase)
- `id uuid pk default gen_random_uuid()`
- `nome text not null`
- `email text unique`
- `avatar_url text`
- `cor text` (hex/hsl pra UI)
- `permissao app_role not null default 'editor'`
- `created_at timestamptz default now()`

### `clientes`
- `id uuid pk default gen_random_uuid()`
- `nome text not null`
- `nicho text`
- `descricao text`
- `logo_url text`
- `status status_cliente not null default 'ativo'`
- `responsaveis_ids uuid[] not null default '{}'`
- `campos_personalizados jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `cards` (Kanban)
- `id uuid pk default gen_random_uuid()`
- `cliente_id uuid not null references public.clientes(id) on delete cascade`
- `titulo text not null`
- `descricao text`
- `status status_card not null default 'ideias'`
- `posicao int not null default 0`
- `responsaveis_ids uuid[] not null default '{}'` (herdado do cliente via trigger)
- `data_agendada timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `posts` (1:N com cards)
- `id uuid pk default gen_random_uuid()`
- `card_id uuid not null references public.cards(id) on delete cascade`
- `titulo text`
- `legenda text`
- `formato text` (reels, carrossel, story, etc.)
- `status status_card not null default 'ideias'` (sincronizado com card via trigger)
- `anexos jsonb not null default '[]'::jsonb` (array de `{url, tipo, nome}`)
- `comentarios jsonb not null default '[]'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `user_roles` (preparado pra Auth na próxima fase)
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null` (referenciará auth.users quando Auth ativar)
- `role app_role not null`
- `unique (user_id, role)`

## 3. Função `has_role` (SECURITY DEFINER)

Padrão recomendado pelo Supabase, evita recursão em RLS.

```sql
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
```

## 4. Triggers

### `set_updated_at` (genérico para clientes/cards/posts)
Atualiza `updated_at` em cada UPDATE.

### `propagate_responsaveis_cliente`
Quando `clientes.responsaveis_ids` muda, propaga para todos os `cards` daquele cliente (mesma lista).

### `sync_post_status_with_card`
Quando `cards.status` muda, atualiza `posts.status` de todos os posts vinculados.

## 5. RLS — políticas provisórias permissivas

RLS habilitado em todas as 5 tabelas. Política única por tabela:
```sql
create policy "allow_all_temp" on public.<tabela>
  for all using (true) with check (true);
```

⚠️ **Será substituído na Fase 2 (Auth)** por políticas baseadas em `auth.uid()` e `has_role()`. Aviso explícito ao usuário no fim da execução.

## 6. Sem seed
Banco começa limpo, conforme combinado.

## 7. O que NÃO está nesta fase (próximas)
- Auth email/senha + página `/auth` + `<RequireAuth>`
- Bucket Storage `anexos`
- Refator do `useCRM` (Zustand → React Query + Supabase + Realtime)
- RLS final baseado em roles
- Ajustes Sidebar (usuário/sair) + Configurações (gerenciar roles)

---

Ao aprovar, executo a migração e em seguida confirmo que `src/integrations/supabase/types.ts` foi regenerado automaticamente com os novos tipos.
