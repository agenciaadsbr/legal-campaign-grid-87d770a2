
-- ===== ENUMS =====
create type public.tipo_alerta as enum ('Renovacao', 'Posts_Pendentes', 'Contrato_Finalizando');
create type public.status_alerta as enum ('Pendente', 'Resolvido');
create type public.status_contrato as enum ('Ativo', 'Renovacao', 'Finalizado');
create type public.escopo_custom_field as enum ('cliente', 'post');
create type public.tipo_custom_field as enum ('texto', 'numero', 'data', 'dropdown', 'link', 'lista_suspensa');
create type public.tipo_coluna as enum ('texto','numero','data','dropdown','responsaveis','link','status','etiqueta');

-- ===== contratos =====
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  status public.status_contrato not null default 'Ativo',
  data_inicio date not null,
  data_fim date not null,
  total_posts int not null default 0,
  posts_concluidos int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contratos enable row level security;
create policy "allow_all_temp_contratos" on public.contratos for all using (true) with check (true);
create trigger trg_contratos_updated_at before update on public.contratos for each row execute function public.set_updated_at();
create index idx_contratos_cliente on public.contratos(cliente_id);

-- ===== comentarios =====
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  usuario_id uuid not null,
  comentario_texto text not null,
  imagem_url text,
  created_at timestamptz not null default now()
);
alter table public.comentarios enable row level security;
create policy "allow_all_temp_comentarios" on public.comentarios for all using (true) with check (true);
create index idx_comentarios_post on public.comentarios(post_id);
create index idx_comentarios_cliente on public.comentarios(cliente_id);

-- ===== alertas =====
create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo_alerta public.tipo_alerta not null,
  data_alerta date not null default current_date,
  status public.status_alerta not null default 'Pendente',
  mensagem text not null,
  created_at timestamptz not null default now()
);
alter table public.alertas enable row level security;
create policy "allow_all_temp_alertas" on public.alertas for all using (true) with check (true);
create index idx_alertas_cliente on public.alertas(cliente_id);
create index idx_alertas_status on public.alertas(status);

-- ===== custom_fields =====
create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  escopo public.escopo_custom_field not null,
  nome text not null,
  tipo public.tipo_custom_field not null,
  opcoes jsonb not null default '[]'::jsonb,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.custom_fields enable row level security;
create policy "allow_all_temp_custom_fields" on public.custom_fields for all using (true) with check (true);
create index idx_custom_fields_escopo on public.custom_fields(escopo);

-- ===== nichos =====
create table public.nichos (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  cor text not null default '#3b82f6',
  created_at timestamptz not null default now()
);
alter table public.nichos enable row level security;
create policy "allow_all_temp_nichos" on public.nichos for all using (true) with check (true);

-- ===== status_options =====
create table public.status_options (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  cor text not null default '#10b981',
  created_at timestamptz not null default now()
);
alter table public.status_options enable row level security;
create policy "allow_all_temp_status_options" on public.status_options for all using (true) with check (true);

-- ===== colunas_cliente =====
create table public.colunas_cliente (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  tipo public.tipo_coluna not null default 'texto',
  ordem int not null default 0,
  oculta boolean not null default false,
  fixada boolean not null default false,
  largura int not null default 150,
  cor text,
  fixa boolean not null default false,
  opcoes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.colunas_cliente enable row level security;
create policy "allow_all_temp_colunas_cliente" on public.colunas_cliente for all using (true) with check (true);

-- ===== modelos_colunas =====
create table public.modelos_colunas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  colunas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.modelos_colunas enable row level security;
create policy "allow_all_temp_modelos_colunas" on public.modelos_colunas for all using (true) with check (true);
