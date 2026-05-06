## Módulo "Aulas"

Novo módulo de capacitação interna, replicando a estrutura/layout das telas enviadas, mas usando os tokens semânticos do Dash Tasks (azul escuro no dark, sidebar azul no light).

### 1. Banco de dados (Supabase)

Nova tabela `aulas`:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `titulo` | text NOT NULL | |
| `descricao` | text | |
| `tipo_video` | text NOT NULL | enum check: `youtube` \| `vimeo` \| `panda` |
| `video_url` | text NOT NULL | |
| `categoria` | text | usado para agrupar (ex: "Dados Operacionais", "Offboarding") |
| `ordem` | int | ordenação dentro da categoria |
| `thumbnail_url` | text | opcional, URL/upload |
| `anexo_url` | text | opcional, arquivo |
| `anexo_nome` | text | nome amigável do anexo |
| `created_by` | uuid → auth.users | |
| `created_at` / `updated_at` | timestamptz | trigger `update_updated_at_column` |

**RLS**:
- SELECT: qualquer autenticado.
- INSERT/UPDATE/DELETE: apenas `has_role(auth.uid(), 'admin')`.

**Storage**: bucket público `aulas-assets` para thumbnails e anexos (políticas: leitura pública, escrita apenas admin).

### 2. Rotas e navegação

- Nova rota `/aulas` em `src/App.tsx` → `<Aulas />`.
- Item no `AppSidebar.tsx` "Aulas" (ícone `BookOpen` do lucide-react) entre "Relatórios" e "Configurações", visível para todos autenticados.

### 3. Páginas e componentes

**`src/pages/Aulas.tsx`**
- Header: título "Aulas sobre a Plataforma" + subtítulo "Capacite-se com nossos treinamentos exclusivos.", botão `+ Nova Aula` à direita (só admin).
- Busca aulas via `useQuery`, agrupa por `categoria` (sem categoria → "Outros").
- Para cada categoria: heading + linha divisória + grid responsivo (`md:grid-cols-2 lg:grid-cols-3`) de `AulaCard`.
- Empty state padronizado quando vazio.

**`src/components/aulas/AulaCard.tsx`**
- Card com thumbnail (16:9) + overlay com botão Play centralizado.
- Se sem thumbnail: gradiente azul escuro com ícone Play.
- Footer: título (bold) + descrição (muted-foreground, line-clamp-2).
- Hover: leve escala/sombra.
- Click → abre `AulaPlayerDialog`.
- Admin: menu `⋯` (três pontos) com Editar/Excluir.

**`src/components/aulas/AulaFormDialog.tsx`** (criar/editar)
- Campos conforme imagem: Título*, Descrição, Tipo de Vídeo (Select: YouTube/Vimeo/Panda Video), Categoria (input livre com sugestões das categorias existentes), URL do Vídeo*, Ordem (number opcional), Thumbnail (input URL + botão upload), Anexo (input nome + botão upload).
- Largura `max-w-2xl`, segue o padrão do `DemandaDetalheDialog` (`max-h-[85vh] overflow-y-auto p-4 md:p-5`).
- Validação Zod + react-hook-form.
- Uploads via `supabase.storage.from('aulas-assets')`.

**`src/components/aulas/AulaPlayerDialog.tsx`**
- Dialog `max-w-4xl` com player responsivo 16:9.
- Helpers `getEmbedUrl(tipo, url)`:
  - YouTube → `https://www.youtube.com/embed/{id}`
  - Vimeo → `https://player.vimeo.com/video/{id}`
  - Panda Video → URL embed direta (assume `iframe.pandavideo.com.br/embed/?v={id}` ou usa URL fornecida se já for embed).
- Mostra título, descrição e link de download do anexo se houver.

**`src/components/aulas/ConfirmarExcluirAulaDialog.tsx`**
- AlertDialog padrão de confirmação.

### 4. Estilo

- 100% via tokens semânticos (`bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`).
- Cards com `rounded-lg border bg-card shadow-sm`, igual ao `Card` shadcn existente.
- Sem cores hex hardcoded.

### 5. Versão

Bumpar `public/version.json` para forçar reload nos clientes.

### Detalhes técnicos

- Migration SQL: `create table`, RLS policies, trigger `updated_at`, bucket de storage + policies.
- Tipos do Supabase serão regenerados automaticamente após a migration.
- Ícone do menu: `BookOpen` (lucide-react), já disponível no projeto.
- Parser de URL de vídeo isolado em `src/lib/aulas-video.ts` (testável, suporta `youtu.be`, `youtube.com/watch?v=`, `vimeo.com/{id}`, Panda).
- Permissões: leitura aberta a todos os roles autenticados; escrita só admin (mesmo padrão de `documentos_globais`).
