
-- ===== 1. ENUMS =====
create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.status_cliente as enum ('ativo', 'pausado', 'inativo');
create type public.status_card as enum ('ideias','producao','aprovacao','agendado','publicado','arquivado');

-- ===== 2. FUNÇÃO updated_at GENÉRICA =====
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== 3. TABELA responsaveis =====
create table public.responsaveis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique,
  avatar_url text,
  cor text default '#6366f1',
  permissao public.app_role not null default 'editor',
  created_at timestamptz not null default now()
);

alter table public.responsaveis enable row level security;

create policy "allow_all_temp_responsaveis"
  on public.responsaveis
  for all
  using (true)
  with check (true);

-- ===== 4. TABELA clientes =====
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nicho text,
  descricao text,
  logo_url text,
  status public.status_cliente not null default 'ativo',
  responsaveis_ids uuid[] not null default '{}',
  campos_personalizados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

create policy "allow_all_temp_clientes"
  on public.clientes
  for all
  using (true)
  with check (true);

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row
  execute function public.set_updated_at();

create index idx_clientes_status on public.clientes(status);
create index idx_clientes_responsaveis on public.clientes using gin(responsaveis_ids);

-- ===== 5. TABELA cards (Kanban) =====
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  titulo text not null,
  descricao text,
  status public.status_card not null default 'ideias',
  posicao int not null default 0,
  responsaveis_ids uuid[] not null default '{}',
  data_agendada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "allow_all_temp_cards"
  on public.cards
  for all
  using (true)
  with check (true);

create trigger trg_cards_updated_at
  before update on public.cards
  for each row
  execute function public.set_updated_at();

create index idx_cards_cliente on public.cards(cliente_id);
create index idx_cards_status on public.cards(status);

-- ===== 6. TABELA posts =====
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  titulo text,
  legenda text,
  formato text,
  status public.status_card not null default 'ideias',
  anexos jsonb not null default '[]'::jsonb,
  comentarios jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "allow_all_temp_posts"
  on public.posts
  for all
  using (true)
  with check (true);

create trigger trg_posts_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();

create index idx_posts_card on public.posts(card_id);

-- ===== 7. TABELA user_roles (preparada para Fase 2 - Auth) =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- ===== 8. FUNÇÃO has_role (SECURITY DEFINER) =====
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Policies de user_roles: somente admins gerenciam; usuários autenticados leem o próprio
create policy "users_can_view_own_roles"
  on public.user_roles
  for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "admins_manage_roles"
  on public.user_roles
  for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== 9. TRIGGER: propaga responsaveis do cliente para os cards =====
create or replace function public.propagate_responsaveis_cliente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.responsaveis_ids is distinct from old.responsaveis_ids then
    update public.cards
       set responsaveis_ids = new.responsaveis_ids
     where cliente_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_propagate_responsaveis_cliente
  after update of responsaveis_ids on public.clientes
  for each row
  execute function public.propagate_responsaveis_cliente();

-- ===== 10. TRIGGER: sincroniza status do card -> posts =====
create or replace function public.sync_post_status_with_card()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update public.posts
       set status = new.status
     where card_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_post_status_with_card
  after update of status on public.cards
  for each row
  execute function public.sync_post_status_with_card();
