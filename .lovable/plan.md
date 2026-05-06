## Diagnóstico

A aba "Vídeos" do Projeto Completo abre uma demanda da categoria `EditorVideo`, e o detalhe da tarefa é renderizado por `DemandaDetalheDialog.tsx`. O bloco "Anexos" usa esta lógica (linhas 76–82, 219–238):

```ts
const fileToDataUrl = (f) => /* FileReader.readAsDataURL */;
// ...
const url = await fileToDataUrl(f);  // base64 enorme
await addAnexo({ demanda_id, nome, url, mime, size });
```

Ou seja, o arquivo inteiro vira `data:` base64 e é gravado no campo `text` `anexos_demandas.url`. Para imagens pequenas funciona; para vídeos (dezenas/centenas de MB) o INSERT no Postgres estoura o limite e o arquivo "some" — não carrega nem persiste. Esse é o erro relatado.

O bucket `anexos` (privado) já existe no Storage, mas hoje não é usado — todos os anexos vão direto para a coluna `url` em base64.

## Correção

Subir o arquivo para o Supabase Storage e gravar apenas a URL pública. Aplica-se a TODAS as categorias de demanda (vídeos, design, IA, personalizado etc.), não só vídeos — o bug é o mesmo.

### 1. Tornar o bucket `anexos` público (migration)

Para que `getPublicUrl()` retorne uma URL acessível direto no `<img>`/`<a download>`/`<video>` sem precisar de signed URL a cada render. Adicionar policies de leitura pública e upload/delete por usuários autenticados com permissão de escrita.

```sql
update storage.buckets set public = true where id = 'anexos';

create policy "anexos_public_read" on storage.objects
  for select using (bucket_id = 'anexos');

create policy "anexos_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.can_write(auth.uid()));

create policy "anexos_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and public.can_write(auth.uid()));
```

### 2. `src/components/demandas/DemandaDetalheDialog.tsx`

Substituir `fileToDataUrl` por upload real em `adicionarAnexo`:

- Para cada arquivo, gerar caminho `demandas/{demanda.id}/{timestamp}-{nomeSeguro}`.
- `supabase.storage.from('anexos').upload(path, file, { contentType: file.type, upsert: false })`.
- `supabase.storage.from('anexos').getPublicUrl(path).data.publicUrl`.
- Chamar `addAnexo({ demanda_id, nome, url: publicUrl, mime, size })`.
- Tratar erro do upload com toast e abortar o restante.

Também ajustar o preview/render dos anexos para suportar vídeo:
- Adicionar `isVideoUrl(url, nome)` (extensões mp4, webm, mov, mkv, m4v, avi).
- No grid de miniaturas, se for vídeo, mostrar um `<video>` com `preload="metadata"` (sem controles, object-cover, clicável) e ao clicar abrir o lightbox `previewAnexo`.
- No lightbox (`Dialog` na linha 921), se `isVideoUrl` renderizar `<video src controls className="max-h-[80vh]" />` em vez de `<img>`.

### 3. `src/store/demandas.ts` — `removeAnexo`

Antes do `delete` na tabela, extrair o `path` da URL pública (`/storage/v1/object/public/anexos/<path>`) do anexo correspondente em `get().anexos` e chamar `supabase.storage.from('anexos').remove([path])`. Se a URL não for do storage (anexos antigos em base64), pular o remove e seguir só com o delete da linha. Isso evita lixo no bucket.

### Fora do escopo

- Migrar anexos antigos em base64 já gravados na tabela: continuam funcionando (a URL é o próprio data:), só não há o que migrar a não ser que o usuário peça.
- Comentários com imagem (`composerImg`) também usam base64 hoje — o usuário não pediu, mantenho como está; podemos atacar depois se quiser.
