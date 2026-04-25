
-- ============================================================
-- FASE 2 - AUTH + RLS FINAL + STORAGE
-- ============================================================

-- ===== 1. Tabela profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  avatar_url text,
  responsavel_id uuid references public.responsaveis(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ===== 2. Trigger: cria profile + atribui role no signup =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  if not exists (select 1 from public.user_roles limit 1) then
    v_role := 'admin';
  else
    v_role := 'editor';
  end if;

  insert into public.user_roles (user_id, role) values (new.id, v_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== 3. Drop policies provisórias =====
drop policy if exists "allow_all_temp_responsaveis" on public.responsaveis;
drop policy if exists "allow_all_temp_clientes" on public.clientes;
drop policy if exists "allow_all_temp_cards" on public.cards;
drop policy if exists "allow_all_temp_posts" on public.posts;
drop policy if exists "allow_all_temp_contratos" on public.contratos;
drop policy if exists "allow_all_temp_comentarios" on public.comentarios;
drop policy if exists "allow_all_temp_alertas" on public.alertas;
drop policy if exists "allow_all_temp_custom_fields" on public.custom_fields;
drop policy if exists "allow_all_temp_nichos" on public.nichos;
drop policy if exists "allow_all_temp_status_options" on public.status_options;
drop policy if exists "allow_all_temp_colunas_cliente" on public.colunas_cliente;
drop policy if exists "allow_all_temp_modelos_colunas" on public.modelos_colunas;

-- ===== 4. Helper: pode escrever (admin OR editor) =====
create or replace function public.can_write(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'editor')
$$;

-- ===== 5. RLS final - padrão "leitura autenticado / escrita admin|editor" =====
-- Macro aplicada em: responsaveis, clientes, cards, posts, contratos, alertas,
-- custom_fields, nichos, status_options, colunas_cliente, modelos_colunas

-- responsaveis
create policy "auth_read_responsaveis" on public.responsaveis for select to authenticated using (true);
create policy "rw_responsaveis_insert" on public.responsaveis for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_responsaveis_update" on public.responsaveis for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_responsaveis_delete" on public.responsaveis for delete to authenticated using (public.can_write(auth.uid()));

-- clientes
create policy "auth_read_clientes" on public.clientes for select to authenticated using (true);
create policy "rw_clientes_insert" on public.clientes for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_clientes_update" on public.clientes for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_clientes_delete" on public.clientes for delete to authenticated using (public.can_write(auth.uid()));

-- cards
create policy "auth_read_cards" on public.cards for select to authenticated using (true);
create policy "rw_cards_insert" on public.cards for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_cards_update" on public.cards for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_cards_delete" on public.cards for delete to authenticated using (public.can_write(auth.uid()));

-- posts
create policy "auth_read_posts" on public.posts for select to authenticated using (true);
create policy "rw_posts_insert" on public.posts for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_posts_update" on public.posts for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_posts_delete" on public.posts for delete to authenticated using (public.can_write(auth.uid()));

-- contratos
create policy "auth_read_contratos" on public.contratos for select to authenticated using (true);
create policy "rw_contratos_insert" on public.contratos for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_contratos_update" on public.contratos for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_contratos_delete" on public.contratos for delete to authenticated using (public.can_write(auth.uid()));

-- alertas
create policy "auth_read_alertas" on public.alertas for select to authenticated using (true);
create policy "rw_alertas_insert" on public.alertas for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_alertas_update" on public.alertas for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_alertas_delete" on public.alertas for delete to authenticated using (public.can_write(auth.uid()));

-- custom_fields
create policy "auth_read_custom_fields" on public.custom_fields for select to authenticated using (true);
create policy "rw_custom_fields_insert" on public.custom_fields for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_custom_fields_update" on public.custom_fields for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_custom_fields_delete" on public.custom_fields for delete to authenticated using (public.can_write(auth.uid()));

-- nichos
create policy "auth_read_nichos" on public.nichos for select to authenticated using (true);
create policy "rw_nichos_insert" on public.nichos for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_nichos_update" on public.nichos for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_nichos_delete" on public.nichos for delete to authenticated using (public.can_write(auth.uid()));

-- status_options
create policy "auth_read_status_options" on public.status_options for select to authenticated using (true);
create policy "rw_status_options_insert" on public.status_options for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_status_options_update" on public.status_options for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_status_options_delete" on public.status_options for delete to authenticated using (public.can_write(auth.uid()));

-- colunas_cliente
create policy "auth_read_colunas_cliente" on public.colunas_cliente for select to authenticated using (true);
create policy "rw_colunas_cliente_insert" on public.colunas_cliente for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_colunas_cliente_update" on public.colunas_cliente for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_colunas_cliente_delete" on public.colunas_cliente for delete to authenticated using (public.can_write(auth.uid()));

-- modelos_colunas
create policy "auth_read_modelos_colunas" on public.modelos_colunas for select to authenticated using (true);
create policy "rw_modelos_colunas_insert" on public.modelos_colunas for insert to authenticated with check (public.can_write(auth.uid()));
create policy "rw_modelos_colunas_update" on public.modelos_colunas for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy "rw_modelos_colunas_delete" on public.modelos_colunas for delete to authenticated using (public.can_write(auth.uid()));

-- ===== 6. comentarios: autor controla os próprios; admin tudo =====
create policy "auth_read_comentarios" on public.comentarios for select to authenticated using (true);
create policy "users_create_own_comentarios" on public.comentarios for insert to authenticated with check (auth.uid() = usuario_id);
create policy "users_update_own_comentarios" on public.comentarios for update to authenticated using (auth.uid() = usuario_id or public.has_role(auth.uid(), 'admin'));
create policy "users_delete_own_comentarios" on public.comentarios for delete to authenticated using (auth.uid() = usuario_id or public.has_role(auth.uid(), 'admin'));

-- ===== 7. profiles =====
create policy "users_read_own_profile" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "users_update_own_profile" on public.profiles for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(), 'admin')) with check (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "admins_insert_profile" on public.profiles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

-- ===== 8. Storage bucket anexos =====
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

create policy "auth_read_anexos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'anexos');

create policy "auth_upload_anexos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'anexos' and auth.uid() = owner);

create policy "owner_or_admin_delete_anexos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'anexos' and (auth.uid() = owner or public.has_role(auth.uid(), 'admin')));

create policy "owner_update_anexos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'anexos' and auth.uid() = owner)
  with check (bucket_id = 'anexos' and auth.uid() = owner);
