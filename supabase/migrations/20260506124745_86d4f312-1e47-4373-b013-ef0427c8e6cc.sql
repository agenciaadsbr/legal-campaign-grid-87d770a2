-- Helper: retorna o responsavel_id vinculado ao auth.uid() atual
create or replace function public.current_responsavel_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select responsavel_id
    from public.profiles
   where id = auth.uid()
   limit 1
$$;

-- Substitui política antiga (comparava auth.uid com responsaveis.id)
drop policy if exists auth_read_demandas on public.demandas;

create policy auth_read_demandas on public.demandas
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::app_role)
  or criado_por = auth.uid()
  or public.current_responsavel_id() = any(responsaveis_ids)
  or public.current_responsavel_id() = responsavel_id
);