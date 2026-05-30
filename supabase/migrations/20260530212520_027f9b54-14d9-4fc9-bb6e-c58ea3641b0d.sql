
-- Tornar bucket 'anexos' privado (avatars e aulas-assets continuam públicos por enquanto)
UPDATE storage.buckets SET public = false WHERE id = 'anexos';

-- Remover policies antigas conflitantes do bucket anexos (best-effort)
DROP POLICY IF EXISTS "anexos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Anexos public read" ON storage.objects;
DROP POLICY IF EXISTS "anexos_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "anexos_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "anexos_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "anexos_authenticated_delete" ON storage.objects;

-- Permitir que usuários autenticados leiam / façam upload / atualizem / removam objetos do bucket 'anexos'
CREATE POLICY "anexos_authenticated_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'anexos');

CREATE POLICY "anexos_authenticated_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'anexos');

CREATE POLICY "anexos_authenticated_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'anexos')
WITH CHECK (bucket_id = 'anexos');

CREATE POLICY "anexos_authenticated_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'anexos');
