## Problema

O upload de vídeo na aba **Aulas** falha com `Bucket not found` porque o código (`src/components/aulas/AulaFormDialog.tsx`) faz upload para o bucket `aulas-assets`, mas esse bucket não existe no Supabase Storage. Hoje só existe o bucket `anexos`.

## Solução

Criar o bucket `aulas-assets` (público, para servir vídeos/thumbnails/anexos das aulas via URL pública) e adicionar políticas RLS em `storage.objects`.

### Migração SQL

1. `insert into storage.buckets (id, name, public) values ('aulas-assets','aulas-assets', true);`
2. Policies em `storage.objects` para o bucket `aulas-assets`:
   - **SELECT**: público (`true`) — necessário porque o player consome a URL pública.
   - **INSERT / UPDATE / DELETE**: somente usuários autenticados com permissão de escrita (`public.can_write(auth.uid())`), seguindo o padrão já usado no projeto.

### Escopo

- Sem mudanças em código frontend; o `AulaFormDialog` já aponta para `aulas-assets`.
- Sem mexer em outros buckets/policies existentes.
- Limites de tamanho de arquivo continuam o default do Supabase (50MB). Se precisar aumentar para vídeos maiores, podemos ajustar `file_size_limit` do bucket em outra rodada.
