-- Criar o bucket de avatars se não existir
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Políticas de segurança para o bucket avatars
-- Permitir acesso público para leitura
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Permitir que usuários façam upload de suas próprias fotos
-- O nome do arquivo deve começar com o ID do usuário (ou estar em uma pasta com o ID)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- Permitir que usuários atualizem suas próprias fotos
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- Permitir que usuários deletem suas próprias fotos
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);