update storage.buckets set public = true where id = 'anexos';

drop policy if exists "anexos_public_read" on storage.objects;
drop policy if exists "anexos_auth_insert" on storage.objects;
drop policy if exists "anexos_auth_delete" on storage.objects;
drop policy if exists "anexos_auth_update" on storage.objects;

create policy "anexos_public_read" on storage.objects
  for select using (bucket_id = 'anexos');

create policy "anexos_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.can_write(auth.uid()));

create policy "anexos_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'anexos' and public.can_write(auth.uid()))
  with check (bucket_id = 'anexos' and public.can_write(auth.uid()));

create policy "anexos_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and public.can_write(auth.uid()));