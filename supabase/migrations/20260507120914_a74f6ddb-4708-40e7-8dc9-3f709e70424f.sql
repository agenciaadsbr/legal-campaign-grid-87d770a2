insert into storage.buckets (id, name, public, file_size_limit)
values ('aulas-assets', 'aulas-assets', true, 524288000)
on conflict (id) do update set public = true, file_size_limit = 524288000;

create policy "Aulas assets publicamente acessiveis"
  on storage.objects for select
  using (bucket_id = 'aulas-assets');

create policy "Aulas assets upload por editores"
  on storage.objects for insert
  with check (bucket_id = 'aulas-assets' and public.can_write(auth.uid()));

create policy "Aulas assets update por editores"
  on storage.objects for update
  using (bucket_id = 'aulas-assets' and public.can_write(auth.uid()));

create policy "Aulas assets delete por editores"
  on storage.objects for delete
  using (bucket_id = 'aulas-assets' and public.can_write(auth.uid()));